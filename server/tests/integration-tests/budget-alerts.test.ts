import supertest from "supertest";
import { app, server } from "../../src/index";
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from "../../src/db";

const request = supertest(app);

describe("---------------- budget alert routes ----------------", () => {

    const runId = randomUUID().slice(0, 8);
    const projectName = `Alerts ${runId}`;
    let adminToken: string;
    let ownerToken: string;
    let adminId: string;
    let ownerId: string;
    let categoryId: string;
    let projectId: string;

    const createUser = (label: string, role_name: string) => prisma.user.create({
        data: {
            username: `alerts-${label}-${runId}`,
            email: `alerts-${label}-${runId}@example.com`,
            password: 'not-used',
            role_name,
            role: { connectOrCreate: { where: { role_name }, create: { role_name } } },
        },
    });

    const addApprovedExpense = (amount: number) => request.post('/api/expenses')
        .set('Cookie', `jwt=${adminToken}`)
        .field('project_id', projectId)
        .field('date', '2026-03-12')
        .field('vendor', 'Steel Supplies')
        .field('amount', String(amount));

    const ownerNotifications = async () => {
        const response = await request.get('/api/notifications').set('Cookie', `jwt=${ownerToken}`);
        return response.body.data.filter((notification: { project_id: string }) => notification.project_id === projectId);
    };

    beforeAll(async () => {
        const admin = await createUser('admin', 'Administrator');
        const owner = await createUser('owner', 'Contributor');
        adminId = admin.id;
        ownerId = owner.id;
        adminToken = jwt.sign({ id: admin.id }, process.env.SECRET, { expiresIn: '1h' });
        ownerToken = jwt.sign({ id: owner.id }, process.env.SECRET, { expiresIn: '1h' });
        const category = await prisma.category.create({ data: { category_name: `Alerts ${runId}` } });
        categoryId = category.id;

        const project = await request.post('/api/projects')
            .set('Cookie', `jwt=${ownerToken}`)
            .send({ project_name: projectName, category_id: categoryId, alert_threshold: 50 });
        projectId = project.body.id;
        await request.post('/api/financialData')
            .set('Cookie', `jwt=${ownerToken}`)
            .send({ year: 2026, month: 3, initial_budget: 100, project_id: projectId, project_name: projectName });
    });

    afterAll(async () => {
        await prisma.notification.deleteMany({ where: { project_name: projectName } });
        await prisma.project.deleteMany({ where: { id: projectId } });
        await prisma.auditLog.deleteMany({ where: { project_id: projectId } });
        await prisma.category.deleteMany({ where: { id: categoryId } });
        await prisma.user.deleteMany({ where: { id: { in: [adminId, ownerId] } } });
        await server.close();
    });

    it("should save the alert threshold given when the project is created", async () => {
        const response = await request.get(`/api/projects/${projectId}`).set('Cookie', `jwt=${ownerToken}`);
        expect(response.status).toBe(200);
        expect(response.body.alert_threshold).toBe(50);
    });

    it("should return 400 for an alert threshold above 100", async () => {
        const response = await request.put(`/api/projects/${projectId}`)
            .set('Cookie', `jwt=${ownerToken}`)
            .send({ project_name: projectName, alert_threshold: 150 });
        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Alert threshold must be between 1 and 100');
    });

    it("should not notify anyone while spending is under the threshold", async () => {
        await addApprovedExpense(40);

        expect(await ownerNotifications()).toEqual([]);
    });

    it("should notify the owner and the administrators once spending passes the threshold", async () => {
        await addApprovedExpense(20);

        const notifications = await ownerNotifications();
        expect(notifications).toEqual([
            expect.objectContaining({ level: 'Threshold', threshold: 50, budget: 100, spent: 60, percent_used: 60, read_at: null }),
        ]);
        const adminList = await request.get('/api/notifications').set('Cookie', `jwt=${adminToken}`);
        expect(adminList.body.data).toContainEqual(expect.objectContaining({ project_id: projectId, level: 'Threshold' }));
    });

    it("should not notify again while the project stays past the threshold", async () => {
        await addApprovedExpense(10);

        expect(await ownerNotifications()).toHaveLength(1);
    });

    it("should notify again when the project goes over budget", async () => {
        await addApprovedExpense(50);

        const notifications = await ownerNotifications();
        expect(notifications.map((notification: { level: string }) => notification.level)).toEqual(['OverBudget', 'Threshold']);
        expect(notifications[0]).toEqual(expect.objectContaining({ spent: 120, percent_used: 120 }));
    });

    it("should count the unread notifications and mark one as read", async () => {
        const [latest] = await ownerNotifications();
        const before = await request.get('/api/notifications').set('Cookie', `jwt=${ownerToken}`);

        const response = await request.post(`/api/notifications/${latest.id}/read`).set('Cookie', `jwt=${ownerToken}`);

        expect(response.status).toBe(200);
        expect(response.body.read_at).not.toBeNull();
        const after = await request.get('/api/notifications').set('Cookie', `jwt=${ownerToken}`);
        expect(after.body.unread_count).toBe(before.body.unread_count - 1);
    });

    it("should return 404 for a notification of another user", async () => {
        const [latest] = await ownerNotifications();

        const response = await request.post(`/api/notifications/${latest.id}/read`).set('Cookie', `jwt=${adminToken}`);

        expect(response.status).toBe(404);
    });

    it("should mark every notification of the user as read", async () => {
        const response = await request.post('/api/notifications/read-all').set('Cookie', `jwt=${ownerToken}`);

        expect(response.status).toBe(200);
        const after = await request.get('/api/notifications').set('Cookie', `jwt=${ownerToken}`);
        expect(after.body.unread_count).toBe(0);
    });

    it("should return 400 for an invalid notification ID", async () => {
        const response = await request.post('/api/notifications/not-a-uuid/read').set('Cookie', `jwt=${ownerToken}`);
        expect(response.status).toBe(400);
    });

    it("should return 401 without a session", async () => {
        const response = await request.get('/api/notifications');
        expect(response.status).toBe(401);
    });
});
