import * as categoryService from '../../../src/services/category.service.js';
import * as categoryRepository from '../../../src/repositories/category.repository.js';
import { Prisma } from '@prisma/client';
import { buildCategory, ID, OTHER_ID } from '../helpers/factories.js';
import { CategoryNotFoundError, DuplicateCategoryError } from '../../../src/categories.js';

jest.mock('../../../src/repositories/category.repository.js');

const repo = jest.mocked(categoryRepository);

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('internal details', { code, clientVersion: 'test' });

describe('category.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createCategory', () => {
    it('returns the category created by the repository', async () => {
      const category = buildCategory();
      repo.createCategory.mockResolvedValue(category);

      await expect(categoryService.createCategory('Infrastructure')).resolves.toEqual(category);
      expect(repo.createCategory).toHaveBeenCalledTimes(1);
      expect(repo.createCategory).toHaveBeenCalledWith('Infrastructure');
    });

    it('checks the name case-insensitively before creating', async () => {
      repo.createCategory.mockResolvedValue(buildCategory());

      await categoryService.createCategory('Infrastructure');

      expect(repo.findCategoryByName).toHaveBeenCalledWith('Infrastructure', undefined);
    });

    it('rejects a name that already exists in any case without creating it', async () => {
      repo.findCategoryByName.mockResolvedValue(buildCategory({ category_name: 'Tech' }));

      const error = await categoryService.createCategory('tech').catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateCategoryError);
      expect(error.message).toBe('A category named "Tech" already exists.');
      expect(repo.createCategory).not.toHaveBeenCalled();
    });

    it('turns a unique constraint failure into a duplicate error', async () => {
      repo.createCategory.mockRejectedValue(prismaError('P2002'));

      const error = await categoryService.createCategory('Tech').catch((e) => e);

      expect(error).toBeInstanceOf(DuplicateCategoryError);
      expect(error.message).toBe('A category named "Tech" already exists.');
    });

    it('wraps an Error thrown by the repository', async () => {
      repo.createCategory.mockRejectedValue(new Error('Unique constraint failed'));

      await expect(categoryService.createCategory('Infrastructure')).rejects.toThrow(
        'Failed to create category: Error: Unique constraint failed',
      );
    });

    it('wraps a non-Error rejection from the repository', async () => {
      repo.createCategory.mockRejectedValue('connection lost');

      await expect(categoryService.createCategory('Infrastructure')).rejects.toThrow(
        'Failed to create category: connection lost',
      );
    });
  });

  describe('updateCategory', () => {
    it('returns the updated category', async () => {
      const category = buildCategory({ category_name: 'Healthcare' });
      repo.updateCategory.mockResolvedValue(category);

      await expect(categoryService.updateCategory(ID, 'Healthcare')).resolves.toEqual(category);
      expect(repo.updateCategory).toHaveBeenCalledWith(ID, 'Healthcare');
    });

    it('forwards an undefined name when none is given', async () => {
      repo.updateCategory.mockResolvedValue(buildCategory());

      await categoryService.updateCategory(ID);

      expect(repo.updateCategory).toHaveBeenCalledWith(ID, undefined);
    });

    it('ignores the category itself when checking the new name', async () => {
      repo.updateCategory.mockResolvedValue(buildCategory({ category_name: 'TECH' }));

      await categoryService.updateCategory(ID, 'TECH');

      expect(repo.findCategoryByName).toHaveBeenCalledWith('TECH', ID);
    });

    it('skips the name check when no name is given', async () => {
      repo.updateCategory.mockResolvedValue(buildCategory());

      await categoryService.updateCategory(ID);

      expect(repo.findCategoryByName).not.toHaveBeenCalled();
    });

    it('rejects a name another category already uses without saving', async () => {
      repo.findCategoryByName.mockResolvedValue(buildCategory({ id: OTHER_ID, category_name: 'Tech' }));

      await expect(categoryService.updateCategory(ID, 'tech')).rejects.toThrow(DuplicateCategoryError);
      expect(repo.updateCategory).not.toHaveBeenCalled();
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateCategory.mockResolvedValue(null);

      await expect(categoryService.updateCategory(OTHER_ID, 'Healthcare')).rejects.toThrow(CategoryNotFoundError);
    });

    it('throws a not-found error when the category was already deleted', async () => {
      repo.updateCategory.mockRejectedValue(prismaError('P2025'));

      await expect(categoryService.updateCategory(ID, 'Healthcare')).rejects.toThrow(
        'This category no longer exists. Refresh the list.',
      );
    });

    it('turns a unique constraint failure into a duplicate error', async () => {
      repo.updateCategory.mockRejectedValue(prismaError('P2002'));

      await expect(categoryService.updateCategory(ID, 'Tech')).rejects.toThrow(DuplicateCategoryError);
    });

    it('wraps repository errors', async () => {
      repo.updateCategory.mockRejectedValue(new Error('Record to update not found'));

      await expect(categoryService.updateCategory(ID, 'Healthcare')).rejects.toThrow(
        'Failed to update category: Error: Record to update not found',
      );
    });
  });

  describe('deleteCategory', () => {
    it('returns the deleted category', async () => {
      const category = buildCategory();
      repo.deleteCategory.mockResolvedValue(category);

      await expect(categoryService.deleteCategory(ID)).resolves.toEqual(category);
      expect(repo.deleteCategory).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteCategory.mockResolvedValue(null);

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow(CategoryNotFoundError);
    });

    it('throws a not-found error when the category was already deleted', async () => {
      repo.deleteCategory.mockRejectedValue(prismaError('P2025'));

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow(CategoryNotFoundError);
    });

    it('does not treat a unique constraint failure on delete as a duplicate', async () => {
      repo.deleteCategory.mockRejectedValue(prismaError('P2002'));

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow('Failed to delete category');
    });

    it('wraps repository errors', async () => {
      repo.deleteCategory.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow(
        'Failed to delete category: Error: Foreign key constraint failed',
      );
    });
  });

  describe('getCategoryUsage', () => {
    it('returns the projects and financial record count that use the category', async () => {
      const projects = [{ id: 'p1', project_name: 'Data Platform' }, { id: 'p2', project_name: 'Mobile App' }];
      repo.getCategoryUsage.mockResolvedValue({ id: ID, category_name: 'Tech', projects, financial_record_count: 14 });

      await expect(categoryService.getCategoryUsage(ID)).resolves.toEqual({
        category_id: ID,
        category_name: 'Tech',
        project_count: 2,
        projects,
        financial_record_count: 14,
      });
      expect(repo.getCategoryUsage).toHaveBeenCalledWith(ID);
    });

    it('reports an unused category', async () => {
      repo.getCategoryUsage.mockResolvedValue({ id: ID, category_name: 'Tech', projects: [], financial_record_count: 0 });

      await expect(categoryService.getCategoryUsage(ID)).resolves.toMatchObject({ project_count: 0, financial_record_count: 0 });
    });

    it('throws a not-found error when the category does not exist', async () => {
      repo.getCategoryUsage.mockResolvedValue(null);

      await expect(categoryService.getCategoryUsage(ID)).rejects.toThrow(CategoryNotFoundError);
    });

    it('wraps repository errors', async () => {
      repo.getCategoryUsage.mockRejectedValue(new Error('timeout'));

      await expect(categoryService.getCategoryUsage(ID)).rejects.toThrow('Failed to fetch category usage: Error: timeout');
    });
  });

  describe('getAllCategories', () => {
    it('returns every category', async () => {
      const categories = [buildCategory(), buildCategory({ id: OTHER_ID, category_name: 'Healthcare' })];
      repo.getAllCategories.mockResolvedValue(categories);

      await expect(categoryService.getAllCategories()).resolves.toEqual(categories);
      expect(repo.getAllCategories).toHaveBeenCalledWith();
    });

    it('returns an empty list when there are no categories', async () => {
      repo.getAllCategories.mockResolvedValue([]);

      await expect(categoryService.getAllCategories()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getAllCategories.mockRejectedValue(new Error('timeout'));

      await expect(categoryService.getAllCategories()).rejects.toThrow('Failed to fetch categories: Error: timeout');
    });
  });

  describe('getCategoryById', () => {
    it('returns the matching category', async () => {
      const category = buildCategory();
      repo.getCategoryById.mockResolvedValue(category);

      await expect(categoryService.getCategoryById(ID)).resolves.toEqual(category);
      expect(repo.getCategoryById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getCategoryById.mockResolvedValue(null);

      await expect(categoryService.getCategoryById(ID)).rejects.toThrow(
        `Failed to fetch category: Error: Category with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.getCategoryById.mockRejectedValue(new Error('timeout'));

      await expect(categoryService.getCategoryById(ID)).rejects.toThrow('Failed to fetch category: Error: timeout');
    });
  });
});
