import * as projectController from '../../../src/controllers/project.controller.js';
import * as projectService from '../../../src/services/project.service.js';
import { buildProject, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/project.service.js');

const service = jest.mocked(projectService);

const START = new Date('2026-02-01T00:00:00.000Z');
const END = new Date('2026-12-31T00:00:00.000Z');

const body = {
  project_name: 'Bridge Renovation',
  description: 'Renovate the river bridge',
  category_id: OTHER_ID,
  category_name: 'Infrastructure',
  start_date: START,
  end_date: END,
  created_by_id: OTHER_ID,
};

describe('project.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createProject', () => {
    it('responds 201 and forwards the body fields in order', async () => {
      const project = buildProject();
      service.createProject.mockResolvedValue(project);
      const res = mockResponse();

      await projectController.createProject(mockRequest({ body, user: { id: ID } }), res);

      expect(service.createProject).toHaveBeenCalledWith(
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        ID,
      );
      expectResponse(res, 201, project);
    });

    it('responds 500 with the service error message', async () => {
      service.createProject.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.createProject(mockRequest({ body }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('updateProject', () => {
    it('responds 200 and forwards the path id with the body fields, without changing the owner', async () => {
      const project = buildProject();
      service.updateProject.mockResolvedValue(project);
      const res = mockResponse();

      await projectController.updateProject(mockRequest({ params: { id: ID }, body }), res);

      expect(service.updateProject).toHaveBeenCalledWith(
        ID,
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
      );
      expectResponse(res, 200, project);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.updateProject.mockResolvedValue(null);
      const res = mockResponse();

      await projectController.updateProject(mockRequest({ params: { id: ID }, body }), res);

      expectResponse(res, 404, { error: `Project with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.updateProject.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.updateProject(mockRequest({ params: { id: ID }, body }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('deleteProject', () => {
    it('responds 200 with the deleted project', async () => {
      const project = buildProject();
      service.deleteProject.mockResolvedValue(project);
      const res = mockResponse();

      await projectController.deleteProject(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteProject).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, project);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.deleteProject.mockResolvedValue(null);
      const res = mockResponse();

      await projectController.deleteProject(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Project with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deleteProject.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.deleteProject(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllProjects', () => {
    it('responds 200 with the paginated result using the query offset and limit', async () => {
      const page = {
        data: [buildProject()],
        pagination: { offset: 6, limit: 6, totalItems: 7, totalPages: 2, hasMore: false },
      };
      service.getAllProjects.mockResolvedValue(page);
      const res = mockResponse();

      await projectController.getAllProjects(mockRequest({ query: { offset: 6, limit: 6 } }), res);

      expect(service.getAllProjects).toHaveBeenCalledWith(6, 6);
      expectResponse(res, 200, page);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllProjects.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.getAllProjects(mockRequest({ query: { offset: 0, limit: 6 } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getProjectById', () => {
    it('responds 200 with the project', async () => {
      const project = buildProject();
      service.getProjectById.mockResolvedValue(project);
      const res = mockResponse();

      await projectController.getProjectById(mockRequest({ params: { id: ID } }), res);

      expect(service.getProjectById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, project);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getProjectById.mockResolvedValue(null);
      const res = mockResponse();

      await projectController.getProjectById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Project with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getProjectById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.getProjectById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getBudgetSummary', () => {
    it('responds 200 with the summary', async () => {
      const summary = { overall: { budget: 0 }, projects: [] };
      service.getBudgetSummary.mockResolvedValue(summary as never);
      const res = mockResponse();

      await projectController.getBudgetSummary(mockRequest(), res);

      expectResponse(res, 200, summary);
    });

    it('responds 500 when the service throws', async () => {
      service.getBudgetSummary.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.getBudgetSummary(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getBudgetByCategory', () => {
    it('responds 200 with the category totals', async () => {
      const categories = [{ category_id: 'c1', category_name: 'Roads', budget: 100, spent: 50 }];
      service.getBudgetByCategory.mockResolvedValue(categories);
      const res = mockResponse();

      await projectController.getBudgetByCategory(mockRequest(), res);

      expectResponse(res, 200, categories);
    });

    it('responds 500 when the service throws', async () => {
      service.getBudgetByCategory.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.getBudgetByCategory(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getProjectTrend', () => {
    it('responds 200 with the trend for the path id', async () => {
      const trend = { project_id: ID, project_name: 'Bridge', monthly: [], yearly: [] };
      service.getProjectTrend.mockResolvedValue(trend);
      const res = mockResponse();

      await projectController.getProjectTrend(mockRequest({ params: { id: ID } }), res);

      expect(service.getProjectTrend).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, trend);
    });

    it('responds 404 when the project does not exist', async () => {
      service.getProjectTrend.mockResolvedValue(null);
      const res = mockResponse();

      await projectController.getProjectTrend(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Project with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getProjectTrend.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await projectController.getProjectTrend(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
