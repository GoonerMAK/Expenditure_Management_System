import * as categoryController from '../../../src/controllers/category.controller.js';
import * as categoryService from '../../../src/services/category.service.js';
import { buildCategory, ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/category.service.js');

const service = jest.mocked(categoryService);

describe('category.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
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

    it('responds 500 with the service error message', async () => {
      service.createCategory.mockRejectedValue(new Error('Failed to create category: duplicate'));
      const res = mockResponse();

      await categoryController.createCategory(mockRequest({ body: { category_name: 'Infrastructure' } }), res);

      expectResponse(res, 500, { error: 'Failed to create category: duplicate' });
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

    it('responds 404 when the service returns nothing', async () => {
      service.updateCategory.mockResolvedValue(null);
      const res = mockResponse();

      await categoryController.updateCategory(
        mockRequest({ params: { id: ID }, body: { category_name: 'Healthcare' } }),
        res,
      );

      expectResponse(res, 404, { error: `Category with id ${ID} not found` });
    });

    it('responds 500 when the service throws, including its not-found error', async () => {
      service.updateCategory.mockRejectedValue(new Error(`Failed to update category: Error: Category with id ${ID} not found`));
      const res = mockResponse();

      await categoryController.updateCategory(
        mockRequest({ params: { id: ID }, body: { category_name: 'Healthcare' } }),
        res,
      );

      expectResponse(res, 500, { error: `Failed to update category: Error: Category with id ${ID} not found` });
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

    it('responds 404 when the service returns nothing', async () => {
      service.deleteCategory.mockResolvedValue(null);
      const res = mockResponse();

      await categoryController.deleteCategory(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Category with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deleteCategory.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await categoryController.deleteCategory(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
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
