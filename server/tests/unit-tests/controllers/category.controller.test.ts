import * as categoryController from '../../../src/controllers/category.controller.js';
import * as categoryService from '../../../src/services/category.service.js';
import { buildCategory, ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';
import { CategoryNotFoundError, DuplicateCategoryError } from '../../../src/categories.js';

jest.mock('../../../src/services/category.service.js');

const service = jest.mocked(categoryService);

const GENERIC = { message: 'Something went wrong while saving the category. Try again.' };
const DUPLICATE = { message: 'A category named "Tech" already exists.' };
const GONE = { message: 'This category no longer exists. Refresh the list.' };

describe('category.controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('createCategory', () => {
    it('responds 201 with the created category', async () => {
      const category = buildCategory();
      service.createCategory.mockResolvedValue(category);
      const res = mockResponse();

      await categoryController.createCategory(mockRequest({ body: { category_name: 'Infrastructure' } }), res);

      expect(service.createCategory).toHaveBeenCalledWith('Infrastructure');
      expectResponse(res, 201, category);
    });

    it('responds 409 with the duplicate name message', async () => {
      service.createCategory.mockRejectedValue(new DuplicateCategoryError('Tech'));
      const res = mockResponse();

      await categoryController.createCategory(mockRequest({ body: { category_name: 'tech' } }), res);

      expectResponse(res, 409, DUPLICATE);
    });

    it('responds 500 with a generic message that hides internal details', async () => {
      service.createCategory.mockRejectedValue(new Error('Failed to create category: PrismaClientKnownRequestError: Unique constraint failed'));
      const res = mockResponse();

      await categoryController.createCategory(mockRequest({ body: { category_name: 'Infrastructure' } }), res);

      expectResponse(res, 500, GENERIC);
    });
  });

  describe('updateCategory', () => {
    it('responds 200 with the updated category', async () => {
      const category = buildCategory({ category_name: 'Healthcare' });
      service.updateCategory.mockResolvedValue(category);
      const res = mockResponse();

      await categoryController.updateCategory(
        mockRequest({ params: { id: ID }, body: { category_name: 'Healthcare' } }),
        res,
      );

      expect(service.updateCategory).toHaveBeenCalledWith(ID, 'Healthcare');
      expectResponse(res, 200, category);
    });

    it('responds 404 when the category no longer exists', async () => {
      service.updateCategory.mockRejectedValue(new CategoryNotFoundError());
      const res = mockResponse();

      await categoryController.updateCategory(
        mockRequest({ params: { id: ID }, body: { category_name: 'Healthcare' } }),
        res,
      );

      expectResponse(res, 404, GONE);
    });

    it('responds 409 when the new name is taken', async () => {
      service.updateCategory.mockRejectedValue(new DuplicateCategoryError('Tech'));
      const res = mockResponse();

      await categoryController.updateCategory(mockRequest({ params: { id: ID }, body: { category_name: 'TECH' } }), res);

      expectResponse(res, 409, DUPLICATE);
    });

    it('responds 500 with a generic message when the service throws', async () => {
      service.updateCategory.mockRejectedValue(new Error('Failed to update category: timeout'));
      const res = mockResponse();

      await categoryController.updateCategory(
        mockRequest({ params: { id: ID }, body: { category_name: 'Healthcare' } }),
        res,
      );

      expectResponse(res, 500, GENERIC);
    });
  });

  describe('deleteCategory', () => {
    it('responds 200 with the deleted category', async () => {
      const category = buildCategory();
      service.deleteCategory.mockResolvedValue(category);
      const res = mockResponse();

      await categoryController.deleteCategory(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteCategory).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, category);
    });

    it('responds 404 when the category no longer exists', async () => {
      service.deleteCategory.mockRejectedValue(new CategoryNotFoundError());
      const res = mockResponse();

      await categoryController.deleteCategory(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, GONE);
    });

    it('responds 500 with a generic message when the service throws', async () => {
      service.deleteCategory.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await categoryController.deleteCategory(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, GENERIC);
    });
  });

  describe('getAllCategories', () => {
    it('responds 200 with every category', async () => {
      const categories = [buildCategory()];
      service.getAllCategories.mockResolvedValue(categories);
      const res = mockResponse();

      await categoryController.getAllCategories(mockRequest(), res);

      expectResponse(res, 200, categories);
    });

    it('responds 200 with an empty list', async () => {
      service.getAllCategories.mockResolvedValue([]);
      const res = mockResponse();

      await categoryController.getAllCategories(mockRequest(), res);

      expectResponse(res, 200, []);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllCategories.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await categoryController.getAllCategories(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getCategoryById', () => {
    it('responds 200 with the category', async () => {
      const category = buildCategory();
      service.getCategoryById.mockResolvedValue(category);
      const res = mockResponse();

      await categoryController.getCategoryById(mockRequest({ params: { id: ID } }), res);

      expect(service.getCategoryById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, category);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getCategoryById.mockResolvedValue(null);
      const res = mockResponse();

      await categoryController.getCategoryById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Category with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getCategoryById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await categoryController.getCategoryById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
