import supertest from "supertest";
import { app, server } from "../../src/index";
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from "../../src/db";

const request = supertest(app);

describe("---------------- report export routes ----------------", () => {

    const runId = randomUUID().slice(0, 8);
    let token: string;
    let userId: string;
    let categoryId: string;
    let projectId: string;
    let projectName: string;

    beforeAll(async () => {
        const user = await prisma.user.create({
            data: {
                username: `report-user-${runId}`,
                email: `report-user-${runId}@example.com`,
                password: 'not-used',
            },
        });
        userId = user.id;
        token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '1h' });
        const category = await prisma.category.create({ data: { category_name: `Report ${runId}` } });
        categoryId = category.id;
        projectName = `Report Project ${runId}`;
        const project = await prisma.project.create({
            data: {
                project_name: projectName,
                category_id: categoryId,
                category_name: category.category_name,
                created_by_id: userId,
                financial_data: {
                    create: [
                        { year: 2025, month: 12, expenditure: 100, initial_budget: 200, project_name: projectName },
                        { year: 2026, month: 1, expenditure: 400, initial_budget: 1000, project_name: projectName },
                        { year: 2026, month: 2, expenditure: 900, initial_budget: 500, revised_budget: 800, project_name: projectName },
                    ],
                },
            },
        });
        projectId = project.id;
    });

    afterAll(async () => {
        await prisma.project.deleteMany({ where: { id: projectId } });
        await prisma.category.deleteMany({ where: { id: categoryId } });
        await prisma.user.deleteMany({ where: { id: userId } });
        await server.close();
    });


    describe("GET /api/reports/projects/:id", () => {

        it("should return a monthly CSV for one year with a total row", async () => {
            const response = await request.get(`/api/reports/projects/${projectId}?period=monthly&year=2026&format=csv`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
            expect(response.headers['content-disposition']).toBe(`attachment; filename="report-project-${runId}-monthly-2026.csv"`);
            const lines = response.text.trim().split('\r\n');
            expect(lines).toContain('"2026-01",1000,400,600,40,"No"');
            expect(lines).toContain('"2026-02",800,900,-100,112.5,"Yes"');
            expect(lines).toContain('"Total",1800,1300,500,72.2,"No"');
            expect(response.text).not.toContain('2025-12');
        });

        it("should return a yearly CSV across all years", async () => {
            const response = await request.get(`/api/reports/projects/${projectId}?period=yearly`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            const lines = response.text.trim().split('\r\n');
            expect(lines).toContain('"2025",200,100,100,50,"No"');
            expect(lines).toContain('"2026",1800,1300,500,72.2,"No"');
            expect(lines).toContain('"Total",2000,1400,600,70,"No"');
        });

        it("should return a PDF file", async () => {
            const response = await request.get(`/api/reports/projects/${projectId}?format=pdf`)
                .set('Cookie', `jwt=${token}`)
                .buffer(true)
                .parse((res, callback) => {
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () => callback(null, Buffer.concat(chunks)));
                });
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('application/pdf');
            expect(response.headers['content-disposition']).toContain('-monthly-all-years.pdf');
            expect((response.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
        });

        it("should return 404 for an unknown project", async () => {
            const response = await request.get(`/api/reports/projects/${randomUUID()}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(404);
        });

        it("should return 400 for an unknown format", async () => {
            const response = await request.get(`/api/reports/projects/${projectId}?format=xlsx`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Format must be one of');
        });

        it("should return 401 without a session", async () => {
            const response = await request.get(`/api/reports/projects/${projectId}`);
            expect(response.status).toBe(401);
        });
    });


    describe("GET /api/reports/categories/:id", () => {

        it("should return a CSV that adds up every project in the category", async () => {
            const response = await request.get(`/api/reports/categories/${categoryId}?period=yearly&year=2026`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.text.startsWith(`﻿"Category","Report ${runId}"`)).toBe(true);
            const lines = response.text.trim().split('\r\n');
            expect(lines).toContain('"Total",1800,1300,500,72.2,"No"');
        });

        it("should return a report for projects with no category", async () => {
            const response = await request.get('/api/reports/categories/uncategorised')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toContain('text/csv');
        });

        it("should return 404 for an unknown category", async () => {
            const response = await request.get(`/api/reports/categories/${randomUUID()}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(404);
        });

        it("should return 400 for an invalid category id", async () => {
            const response = await request.get('/api/reports/categories/not-a-category')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });

});
