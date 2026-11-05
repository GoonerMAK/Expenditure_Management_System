import supertest from "supertest";
import { app, server  } from "../../src/index";
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import prisma from "../../src/db";

const request = supertest(app);

describe("---------------- category routes ----------------", ()=> {
    
    let token: string;
    let readOnlyToken: string;
    let createdCategoryId: string;
    const runId = randomUUID().slice(0, 8);
    const userIds: string[] = [];

    const createUser = async (role_name: string) => {
        const user = await prisma.user.create({
            data: {
                username: `cat-${role_name}-${runId}`,
                email: `cat-${role_name}-${runId}@example.com`,
                password: 'not-used',
                role_name,
                role: { connectOrCreate: { where: { role_name }, create: { role_name } } },
            },
        });
        userIds.push(user.id);
        return jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '1h' });
    };

    beforeAll(async () => {
        token = await createUser('Contributor');
        readOnlyToken = await createUser('Read-only');
    });

    afterAll(async () => {
        await prisma.category.deleteMany({ where: { category_name: { startsWith: `C${runId}` } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await server.close();
    });

    describe("GET /api/categories", () => {

        it("should return success code 200 and all categories", async () => {
            const response = await request.get('/api/categories').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        })
    })


    describe("POST /api/categories", () => {

        it("should create a new category and return success code 201", async () => {
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `C${runId} New` });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.category_name).toBe(`C${runId} New`);
            createdCategoryId = response.body.id;
        });

        it("should return 400 for invalid request body", async () => {
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${token}`)
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Category name can't be empty.");
        });

        it("should return 409 for a name that already exists in any case", async () => {
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `c${runId} NEW` });
            expect(response.status).toBe(409);
            expect(response.body).toEqual({ message: `A category named "C${runId} New" already exists.` });
        });

        it("should return 400 for a name that is too short", async () => {
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: "  ab " });
            expect(response.status).toBe(400);
            expect(response.body.message).toBe("Category name must be 3–20 characters.");
        });

        it("should return 403 for a Read-only user", async () => {
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${readOnlyToken}`)
                .send({ category_name: `C${runId} Blocked` });
            expect(response.status).toBe(403);
        });

        it("should return 401 for an expired session", async () => {
            const expired = jwt.sign({ id: userIds[0] }, process.env.SECRET, { expiresIn: -10 });
            const response = await request.post('/api/categories')
                .set('Cookie', `jwt=${expired}`)
                .send({ category_name: `C${runId} Late` });
            expect(response.status).toBe(401);
        });
    });


    describe("GET /api/categories/:id", () => {

        it("should return a category and success code 200", async () => {
            const response = await request.get(`/api/categories/${createdCategoryId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('category_name');
        });

        it("should return 404 for a non-existing category", async () => {
            const response = await request.get('/api/categories/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    describe("PUT /api/categories/:id", () => {

        it("should update an existing category and return success code 200", async () => {
            const response = await request.put(`/api/categories/${createdCategoryId}`)
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `C${runId} Updated` });
            expect(response.status).toBe(200);
            expect(response.body.category_name).toBe(`C${runId} Updated`);
        });

        it("should allow renaming a category to a different case of its own name", async () => {
            const response = await request.put(`/api/categories/${createdCategoryId}`)
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `C${runId} UPDATED` });
            expect(response.status).toBe(200);
        });

        it("should return 404 for a category that was already deleted", async () => {
            const response = await request.put(`/api/categories/${randomUUID()}`)
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `C${runId} Gone` });
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ message: 'This category no longer exists. Refresh the list.' });
        });

        it("should return 400 for a non-existing category", async () => {
            const response = await request.put('/api/categories/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`)
                .send({ category_name: `C${runId} Updated` });
            expect(response.status).toBe(400);
        });
    });


    describe("DELETE /api/categories/:id", () => {

        it("should delete the created category and return success code 200", async () => {
            const response = await request.delete(`/api/categories/${createdCategoryId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
        });

        it("should return 404 when the category was already deleted", async () => {
            const response = await request.delete(`/api/categories/${createdCategoryId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(404);
            expect(response.body).toEqual({ message: 'This category no longer exists. Refresh the list.' });
        });

        it("should return 400 for a non-existing category", async () => {
            const response = await request.delete('/api/categories/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });

})