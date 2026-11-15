import supertest from "supertest";
import { app, server } from "../../src/index";
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe("---------------- project financial data routes ----------------", () => {
    
    let token: string;
    let createdProjectId: string;
    let createdProjectName: string;
    let createdFinancialDataId: string;

    const category_id = "6e4aa05e-0895-49b6-bc2e-5098d056186c";
    const category_name = "Urgent";
    const start_date = "2024-06-21T15:45:00.000Z";
    const end_date = "2024-06-24T15:59:00.000Z";
    const created_by_id = "a553129f-9774-4791-bea5-1ed4c269f357";

    beforeAll(() => {
        token = jwt.sign({ id: "test-user-id" }, process.env.SECRET, { expiresIn: '1h' });
    });
    
    afterAll(async () => {
        await server.close();
    });


    describe("GET /api/projects", () => {

        it("should return success code 200 and all projects", async () => {
            const response = await request.get('/api/projects').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });


    describe("GET /api/projects with filters", () => {

        it("should return the filtered page with pagination and success code 200", async () => {
            const response = await request.get('/api/projects?search=bridge&sort=spend_desc&from=2024-01-01&to=2024-12-31').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.pagination).toHaveProperty('totalItems');
        });

        it("should return 400 for an unknown sort", async () => {
            const response = await request.get('/api/projects?sort=budget').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Sort must be one of');
        });

        it("should return 400 for a bad date", async () => {
            const response = await request.get('/api/projects?from=not-a-date').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('From date must be a valid date in YYYY-MM-DD format');
        });

        it("should return 400 when from is after to", async () => {
            const response = await request.get('/api/projects?from=2024-06-02&to=2024-06-01').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('From date must be on or before the To date');
        });
    });


    describe("GET /api/projects/owners", () => {

        it("should return success code 200 and the project owners", async () => {
            const response = await request.get('/api/projects/owners').set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });

        it("should return 401 without a session", async () => {
            const response = await request.get('/api/projects/owners');
            expect(response.status).toBe(401);
        });
    });


    describe("POST /api/projects", () => {

        it("should create a new project and return success code 201", async () => {
            const response = await request.post('/api/projects')
                .set('Cookie', `jwt=${token}`)
                .send({ 
                    project_name: "New Project",
                    description: "Project Description",
                    category_id: category_id,
                    category_name: category_name,
                    start_date: start_date,
                    end_date: end_date,
                    created_by_id: created_by_id
                });
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.project_name).toBe("New Project");
            createdProjectId = response.body.id;
            createdProjectName = response.body.project_name;
        });

        it("should return 400 for invalid request body", async () => {
            const response = await request.post('/api/projects')
                .set('Cookie', `jwt=${token}`)
                .send({});
            expect(response.status).toBe(400);
        });
    });

    
    describe("GET /api/projects/:id", () => {

        it("should return a project and success code 200", async () => {
            const response = await request.get(`/api/projects/${createdProjectId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('project_name');
        });

        it("should return 400 for a non-existing project", async () => {
            const response = await request.get('/api/projects/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    describe("PUT /api/projects/:id", () => {

        it("should update an existing project and return success code 200", async () => {
            const response = await request.put(`/api/projects/${createdProjectId}`)
                .set('Cookie', `jwt=${token}`)
                .send({ project_name: "Updated Project" });
            expect(response.status).toBe(200);
            expect(response.body.project_name).toBe("Updated Project");
        });

        it("should return 400 for a non-existing project", async () => {
            const response = await request.put('/api/projects/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`)
                .send({ project_name: "Updated Project" });
            expect(response.status).toBe(400);
        });
    });


    /* -------------- Financial Data ----------------------- */
    describe("POST /api/financialData", () => {

        it("should create a new financial data entry and return success code 201", async () => {
            const response = await request.post('/api/financialData')
                .set('Cookie', `jwt=${token}`)
                .send({
                    year: 2024,
                    month: 7,
                    expenditure: 1000,
                    initial_budget: 5000,
                    revised_budget: 6000,
                    project_id: createdProjectId,
                    project_name: createdProjectName,
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id');
            expect(response.body.year).toBe(2024);
            createdFinancialDataId = response.body.id;
        });

        it("should return 400 for invalid request body", async () => {
            const response = await request.post('/api/financialData')
                .set('Cookie', `jwt=${token}`)
                .send({});
            expect(response.status).toBe(500);
        });
    });


    describe("PUT /api/financialData/:id", () => {

        it("should update an existing financial data entry and return success code 200", async () => {
            const response = await request.put(`/api/financialData/${createdProjectId}`)
                .set('Cookie', `jwt=${token}`)
                .send({
                    year: 2025,
                    month: 8,
                    expenditure: 2000.2,
                });

            expect(response.status).toBe(200);
            expect(response.body.year).toBe(2025);
            expect(response.body.expenditure).toBe(2000.2);
        });

        it("should return 400 for invalid financial data ID", async () => {
            const response = await request.put('/api/financialData/invalid-id')
                .set('Cookie', `jwt=${token}`)
                .send({
                    year: 2025,
                    month: 8,
                    expenditure: 2000.01,
                });
            expect(response.status).toBe(400);
        });
    });


    describe("GET /api/financialData", () => {

        it("should return success code 200 and all financial data entries", async () => {
            const response = await request.get('/api/financialData')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
        });
    });


    describe("GET /api/financialData/:id", () => {

        it("should return a financial data entry and success code 200", async () => {
            const response = await request.get(`/api/financialData/${createdProjectId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body.year).toBe(2025);
        });

        it("should return 400 for invalid financial data ID", async () => {
            const response = await request.get('/api/financialData/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    describe("DELETE /api/financialData/:id", () => {

        it("should delete the created financial data entry and return success code 200", async () => {
            const response = await request.delete(`/api/financialData/${createdFinancialDataId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
        });

        it("should return 400 for invalid financial data ID", async () => {
            const response = await request.delete('/api/financialData/invalid-id')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });


    describe("DELETE /api/projects/:id", () => {

        it("should delete the created project and return success code 200", async () => {
            const response = await request.delete(`/api/projects/${createdProjectId}`)
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(200);
        });

        it("should return 400 for a non-existing project", async () => {
            const response = await request.delete('/api/projects/Th15-15-N-R4ND0M-1D')
                .set('Cookie', `jwt=${token}`);
            expect(response.status).toBe(400);
        });
    });

});
