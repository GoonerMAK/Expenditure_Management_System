import supertest from "supertest";
import { app, server } from "../../src/index";
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe("---------------- user auth routes ----------------", () => {

    let token: string;
    let createdUserId: string;

    beforeAll(async () => {
        token = jwt.sign({ id: "test-user-id" }, process.env.SECRET, { expiresIn: '1h' });
    });

    afterAll(async () => {
        await server.close();
    });


    describe("POST /api/auth/signup", () => {

        it("should create a new user and return success code 201", async () => {
            const response = await request.post('/api/auth/signup')
                .send({
                    email: "testuser@example.com",
                    password: "password123",
                    username: "testuser"
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).not.toHaveProperty('password');
            
            createdUserId = response.body.user.id;

            token = jwt.sign({ id: createdUserId }, process.env.SECRET, { expiresIn: '1h' });
        });

        it("should return 400 for invalid request body", async () => {
            const response = await request.post('/api/auth/signup')
                .send({});
            expect(response.status).toBe(400);
        });
    });


    describe("POST /api/auth/login", () => {

        it("should log in the user and return success code 200", async () => {
            const response = await request.post('/api/auth/login')
                .send({
                    email: "testuser@example.com",
                    password: "password123"
                });

            expect(response.status).toBe(200);
            expect(response.body).not.toHaveProperty('token');
            expect(response.body.user).not.toHaveProperty('password');
            expect(response.body.user.email).toBe("testuser@example.com");
            expect(response.headers['set-cookie'][0]).toMatch(/^jwt=.+HttpOnly/);
        });

        it("should return 400 for invalid credentials", async () => {
            const response = await request.post('/api/auth/login')
                .send({
                    email: "wrong@example.com",
                    password: "wrongpassword"
                });
            expect(response.status).toBe(400);
        });
    });


    describe("GET /api/auth/user", () => {

        it("should return the authenticated user and success code 200", async () => {
            const response = await request.get('/api/auth/user')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body.user).not.toHaveProperty('password');
        });

        it("should return 401 for unauthenticated request", async () => {
            const response = await request.get('/api/auth/user');
            expect(response.status).toBe(401);
        });
    });

    
    describe("PUT /api/users/:id", () => {

        it("should update an existing user and return success code 200", async () => {
            const response = await request.put(`/api/users/${createdUserId}`)
                .set('Cookie', `jwt=${token}`)
                .send({
                    data:{
                        username: "updateduser",
                        email: "updateduser@example.com"
                    }
                });

            expect(response.status).toBe(200);
        });

        it("should return 400 for invalid user ID", async () => {
            const response = await request.put('/api/users/invalid-id')
                .set('Cookie', `jwt=${token}`)
                .send({
                    username: "updateduser",
                    email: "updateduser@example.com"
                });
            expect(response.status).toBe(400);
        });
    });


    describe("GET /api/users/usernames", () => {

        it("should return success code 200 and all usernames", async () => {
            const response = await request.get('/api/users/usernames')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });


    describe("GET /api/users", () => {

        it("should return success code 200 and all users", async () => {
            const response = await request.get('/api/users')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            response.body.forEach((user: object) => expect(user).not.toHaveProperty('password'));
        });
    });


    describe("GET /api/users/:id", () => {

        it("should return a user and success code 200", async () => {
            const response = await request.get(`/api/users/${createdUserId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('email');
            expect(response.body).not.toHaveProperty('password');
        });

        it("should return 400 for invalid user ID", async () => {
            const response = await request.get('/api/users/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });



    /* --------------------- Assigned and Unassigned Roles ---------------------  */
    describe("GET /api/roles/unassigned/:id", () => {

        it("should return success code 200 and unassigned roles for the user", async () => {
            const response = await request.get(`/api/roles/unassigned/${createdUserId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        it("should return 400 for invalid user ID", async () => {
            const response = await request.get('/api/roles/unassigned/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    describe("GET /api/roles/assigned/:id", () => {

        it("should return success code 200 and assigned roles for the user", async () => {
            const response = await request.get(`/api/roles/assigned/${createdUserId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        it("should return 400 for invalid user ID", async () => {
            const response = await request.get('/api/roles/assigned/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    /* -------------------------- Logging out the user -------------------------- */
    describe("POST /api/auth/logout", () => {

        it("should log out the user and return success code 200", async () => {
            const response = await request.post('/api/auth/logout');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Logged out successfully');
        });
    });
    

    /* -------------------------- Delete the user -------------------------- */
    describe("DELETE /api/users/:id", () => {

        it("should delete the created user and return success code 200", async () => {
            const response = await request.delete(`/api/users/${createdUserId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
        });

        it("should return 400 for invalid user ID", async () => {
            const response = await request.delete('/api/users/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });

});
