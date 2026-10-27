import * as categoryService from '../../../src/services/category.service.js';
import * as categoryRepository from '../../../src/repositories/category.repository.js';
import { buildCategory, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/category.repository.js');

const repo = jest.mocked(categoryRepository);

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

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateCategory.mockResolvedValue(null);

      await expect(categoryService.updateCategory(OTHER_ID, 'Healthcare')).rejects.toThrow(
        `Failed to update category: Error: Category with id ${OTHER_ID} not found`,
      );
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

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow(
        `Failed to delete category: Error: Category with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.deleteCategory.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(categoryService.deleteCategory(ID)).rejects.toThrow(
        'Failed to delete category: Error: Foreign key constraint failed',
      );
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
