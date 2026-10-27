import * as projectService from '../../../src/services/project.service.js';
import * as projectRepository from '../../../src/repositories/project.repository.js';
import { buildProject, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/project.repository.js');

const repo = jest.mocked(projectRepository);

const START = new Date('2026-02-01T00:00:00.000Z');
const END = new Date('2026-12-31T00:00:00.000Z');

describe('project.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createProject', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const project = buildProject();
      repo.createProject.mockResolvedValue(project);

      const result = await projectService.createProject(
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );

      expect(result).toEqual(project);
      expect(repo.createProject).toHaveBeenCalledWith(
        'Bridge Renovation',
        'Renovate the river bridge',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );
    });

    it('passes omitted optional fields through as undefined', async () => {
      repo.createProject.mockResolvedValue(buildProject({ description: null }));

      await projectService.createProject('Bridge Renovation');

      expect(repo.createProject).toHaveBeenCalledWith(
        'Bridge Renovation',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('wraps repository errors', async () => {
      repo.createProject.mockRejectedValue(new Error('Unique constraint failed on project_name'));

      await expect(projectService.createProject('Bridge Renovation')).rejects.toThrow(
        'Failed to create project: Error: Unique constraint failed on project_name',
      );
    });
  });

  describe('updateProject', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const project = buildProject({ project_name: 'Bridge Rebuild' });
      repo.updateProject.mockResolvedValue(project);

      const result = await projectService.updateProject(
        ID,
        'Bridge Rebuild',
        'Rebuild',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );

      expect(result).toEqual(project);
      expect(repo.updateProject).toHaveBeenCalledWith(
        ID,
        'Bridge Rebuild',
        'Rebuild',
        OTHER_ID,
        'Infrastructure',
        START,
        END,
        OTHER_ID,
      );
    });

    it('supports a partial update with only the id', async () => {
      repo.updateProject.mockResolvedValue(buildProject());

      await projectService.updateProject(ID);

      expect(repo.updateProject).toHaveBeenCalledWith(
        ID,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateProject.mockResolvedValue(null);

      await expect(projectService.updateProject(ID, 'Bridge Rebuild')).rejects.toThrow(
        `Failed to update project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.updateProject.mockRejectedValue(new Error('Record to update not found'));

      await expect(projectService.updateProject(ID, 'Bridge Rebuild')).rejects.toThrow(
        'Failed to update project: Error: Record to update not found',
      );
    });
  });

  describe('deleteProject', () => {
    it('returns the deleted project', async () => {
      const project = buildProject();
      repo.deleteProject.mockResolvedValue(project);

      await expect(projectService.deleteProject(ID)).resolves.toEqual(project);
      expect(repo.deleteProject).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteProject.mockResolvedValue(null);

      await expect(projectService.deleteProject(ID)).rejects.toThrow(
        `Failed to delete project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.deleteProject.mockRejectedValue(new Error('timeout'));

      await expect(projectService.deleteProject(ID)).rejects.toThrow('Failed to delete project: Error: timeout');
    });
  });

  describe('getAllProjects', () => {
    it('queries the page and the total count with the given offset and limit', async () => {
      repo.getAllProjects.mockResolvedValue([]);
      repo.getProjectsCount.mockResolvedValue(0);

      await projectService.getAllProjects(12, 6);

      expect(repo.getAllProjects).toHaveBeenCalledWith(12, 6);
      expect(repo.getProjectsCount).toHaveBeenCalledTimes(1);
    });

    it('returns the page data with pagination metadata', async () => {
      const projects = [buildProject(), buildProject({ id: OTHER_ID, project_name: 'School Expansion' })];
      repo.getAllProjects.mockResolvedValue(projects);
      repo.getProjectsCount.mockResolvedValue(14);

      await expect(projectService.getAllProjects(0, 6)).resolves.toEqual({
        data: projects,
        pagination: { offset: 0, limit: 6, totalItems: 14, totalPages: 3, hasMore: true },
      });
    });

    it.each`
      offset | limit | total | totalPages | hasMore
      ${0}   | ${6}  | ${0}  | ${0}       | ${false}
      ${0}   | ${6}  | ${6}  | ${1}       | ${false}
      ${0}   | ${6}  | ${7}  | ${2}       | ${true}
      ${6}   | ${6}  | ${12} | ${2}       | ${false}
      ${6}   | ${6}  | ${13} | ${3}       | ${true}
      ${12}  | ${6}  | ${13} | ${3}       | ${false}
      ${30}  | ${6}  | ${13} | ${3}       | ${false}
      ${0}   | ${1}  | ${3}  | ${3}       | ${true}
      ${0}   | ${100}| ${250}| ${3}       | ${true}
    `(
      'offset=$offset limit=$limit total=$total -> totalPages=$totalPages hasMore=$hasMore',
      async ({ offset, limit, total, totalPages, hasMore }) => {
        repo.getAllProjects.mockResolvedValue([]);
        repo.getProjectsCount.mockResolvedValue(total);

        const { pagination } = await projectService.getAllProjects(offset, limit);

        expect(pagination).toEqual({ offset, limit, totalItems: total, totalPages, hasMore });
      },
    );

    it('wraps an error from the page query', async () => {
      repo.getAllProjects.mockRejectedValue(new Error('timeout'));
      repo.getProjectsCount.mockResolvedValue(10);

      await expect(projectService.getAllProjects(0, 6)).rejects.toThrow('Failed to fetch projects: Error: timeout');
    });

    it('wraps an error from the count query', async () => {
      repo.getAllProjects.mockResolvedValue([]);
      repo.getProjectsCount.mockRejectedValue(new Error('count failed'));

      await expect(projectService.getAllProjects(0, 6)).rejects.toThrow('Failed to fetch projects: Error: count failed');
    });
  });

  describe('getProjectById', () => {
    it('returns the matching project', async () => {
      const project = buildProject();
      repo.getProjectById.mockResolvedValue(project);

      await expect(projectService.getProjectById(ID)).resolves.toEqual(project);
      expect(repo.getProjectById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getProjectById.mockResolvedValue(null);

      await expect(projectService.getProjectById(ID)).rejects.toThrow(
        `Failed to fetch project: Error: Project with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.getProjectById.mockRejectedValue(new Error('timeout'));

      await expect(projectService.getProjectById(ID)).rejects.toThrow('Failed to fetch project: Error: timeout');
    });
  });
});
