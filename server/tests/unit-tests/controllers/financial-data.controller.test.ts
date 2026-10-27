import * as financialDataController from '../../../src/controllers/financial-data.controller.js';
import * as financialDataService from '../../../src/services/financial-data.service.js';
import { buildFinancialData, ID, OTHER_ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/financial-data.service.js');

const service = jest.mocked(financialDataService);

const body = {
  year: 2026,
  month: 3,
  expenditure: 1500.5,
  initial_budget: 10000,
  revised_budget: 12000,
  project_id: OTHER_ID,
  project_name: 'Bridge Renovation',
};

describe('financial-data.controller', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createFinancialData', () => {
    it('responds 201 and forwards the body fields in order', async () => {
      const record = buildFinancialData();
      service.createFinancialData.mockResolvedValue(record);
      const res = mockResponse();

      await financialDataController.createFinancialData(mockRequest({ body }), res);

      expect(service.createFinancialData).toHaveBeenCalledWith(2026, 3, 1500.5, 10000, 12000, OTHER_ID, 'Bridge Renovation');
      expectResponse(res, 201, record);
    });

    it('forwards missing optional fields as undefined', async () => {
      service.createFinancialData.mockResolvedValue(buildFinancialData());
      const res = mockResponse();

      await financialDataController.createFinancialData(mockRequest({ body: { year: 2026, month: 3 } }), res);

      expect(service.createFinancialData).toHaveBeenCalledWith(2026, 3, undefined, undefined, undefined, undefined, undefined);
    });

    it('responds 500 with the service error message', async () => {
      service.createFinancialData.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await financialDataController.createFinancialData(mockRequest({ body }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('updateFinancialData', () => {
    it('responds 200 and forwards the path id with the body fields', async () => {
      const record = buildFinancialData();
      service.updateFinancialData.mockResolvedValue(record);
      const res = mockResponse();

      await financialDataController.updateFinancialData(mockRequest({ params: { id: ID }, body }), res);

      expect(service.updateFinancialData).toHaveBeenCalledWith(
        ID,
        2026,
        3,
        1500.5,
        10000,
        12000,
        OTHER_ID,
        'Bridge Renovation',
      );
      expectResponse(res, 200, record);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.updateFinancialData.mockResolvedValue(null);
      const res = mockResponse();

      await financialDataController.updateFinancialData(mockRequest({ params: { id: ID }, body }), res);

      expectResponse(res, 404, { error: `Financial data with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.updateFinancialData.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await financialDataController.updateFinancialData(mockRequest({ params: { id: ID }, body }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('deleteFinancialData', () => {
    it('responds 200 with the deleted record', async () => {
      const record = buildFinancialData();
      service.deleteFinancialData.mockResolvedValue(record);
      const res = mockResponse();

      await financialDataController.deleteFinancialData(mockRequest({ params: { id: ID } }), res);

      expect(service.deleteFinancialData).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, record);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.deleteFinancialData.mockResolvedValue(null);
      const res = mockResponse();

      await financialDataController.deleteFinancialData(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Financial data with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.deleteFinancialData.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await financialDataController.deleteFinancialData(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getAllFinancialData', () => {
    it('responds 200 with every record', async () => {
      const records = [buildFinancialData()];
      service.getAllFinancialData.mockResolvedValue(records);
      const res = mockResponse();

      await financialDataController.getAllFinancialData(mockRequest(), res);

      expectResponse(res, 200, records);
    });

    it('responds 500 when the service throws', async () => {
      service.getAllFinancialData.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await financialDataController.getAllFinancialData(mockRequest(), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });

  describe('getFinancialDataById', () => {
    it('responds 200 with the record', async () => {
      const record = buildFinancialData();
      service.getFinancialDataById.mockResolvedValue(record);
      const res = mockResponse();

      await financialDataController.getFinancialDataById(mockRequest({ params: { id: ID } }), res);

      expect(service.getFinancialDataById).toHaveBeenCalledWith(ID);
      expectResponse(res, 200, record);
    });

    it('responds 404 when the service returns nothing', async () => {
      service.getFinancialDataById.mockResolvedValue(null);
      const res = mockResponse();

      await financialDataController.getFinancialDataById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 404, { error: `Financial data with id ${ID} not found` });
    });

    it('responds 500 when the service throws', async () => {
      service.getFinancialDataById.mockRejectedValue(new Error('boom'));
      const res = mockResponse();

      await financialDataController.getFinancialDataById(mockRequest({ params: { id: ID } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });
  });
});
