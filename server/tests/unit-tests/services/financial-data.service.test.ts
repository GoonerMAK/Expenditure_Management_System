import * as financialDataService from '../../../src/services/financial-data.service.js';
import * as financialDataRepository from '../../../src/repositories/financial-data.repository.js';
import { buildFinancialData, ID, OTHER_ID } from '../helpers/factories.js';

jest.mock('../../../src/repositories/financial-data.repository.js');

const repo = jest.mocked(financialDataRepository);

describe('financial-data.service', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createFinancialData', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const record = buildFinancialData();
      repo.createFinancialData.mockResolvedValue(record);

      const result = await financialDataService.createFinancialData(
        2026,
        3,
        1500.5,
        10000,
        12000,
        OTHER_ID,
        'Bridge Renovation',
      );

      expect(result).toEqual(record);
      expect(repo.createFinancialData).toHaveBeenCalledWith(2026, 3, 1500.5, 10000, 12000, OTHER_ID, 'Bridge Renovation');
    });

    it('passes omitted optional fields through as undefined', async () => {
      repo.createFinancialData.mockResolvedValue(buildFinancialData({ expenditure: null }));

      await financialDataService.createFinancialData(2026, 3);

      expect(repo.createFinancialData).toHaveBeenCalledWith(2026, 3, undefined, undefined, undefined, undefined, undefined);
    });

    it('accepts zero amounts', async () => {
      repo.createFinancialData.mockResolvedValue(buildFinancialData({ expenditure: 0, initial_budget: 0, revised_budget: 0 }));

      await financialDataService.createFinancialData(2026, 1, 0, 0, 0, OTHER_ID, 'Bridge Renovation');

      expect(repo.createFinancialData).toHaveBeenCalledWith(2026, 1, 0, 0, 0, OTHER_ID, 'Bridge Renovation');
    });

    it('wraps repository errors', async () => {
      repo.createFinancialData.mockRejectedValue(new Error('Foreign key constraint failed'));

      await expect(financialDataService.createFinancialData(2026, 3)).rejects.toThrow(
        'Failed to create financial data: Error: Foreign key constraint failed',
      );
    });
  });

  describe('updateFinancialData', () => {
    it('forwards every field to the repository in order and returns the result', async () => {
      const record = buildFinancialData({ expenditure: 2000 });
      repo.updateFinancialData.mockResolvedValue(record);

      const result = await financialDataService.updateFinancialData(
        ID,
        2026,
        4,
        2000,
        10000,
        12000,
        OTHER_ID,
        'Bridge Renovation',
      );

      expect(result).toEqual(record);
      expect(repo.updateFinancialData).toHaveBeenCalledWith(ID, 2026, 4, 2000, 10000, 12000, OTHER_ID, 'Bridge Renovation');
    });

    it('supports a partial update with only the id and one field', async () => {
      repo.updateFinancialData.mockResolvedValue(buildFinancialData());

      await financialDataService.updateFinancialData(ID, undefined, undefined, 99);

      expect(repo.updateFinancialData).toHaveBeenCalledWith(
        ID,
        undefined,
        undefined,
        99,
        undefined,
        undefined,
        undefined,
        undefined,
      );
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.updateFinancialData.mockResolvedValue(null);

      await expect(financialDataService.updateFinancialData(ID, 2026)).rejects.toThrow(
        `Failed to update financial data: Error: Financial data with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.updateFinancialData.mockRejectedValue(new Error('Record to update not found'));

      await expect(financialDataService.updateFinancialData(ID, 2026)).rejects.toThrow(
        'Failed to update financial data: Error: Record to update not found',
      );
    });
  });

  describe('deleteFinancialData', () => {
    it('returns the deleted record', async () => {
      const record = buildFinancialData();
      repo.deleteFinancialData.mockResolvedValue(record);

      await expect(financialDataService.deleteFinancialData(ID)).resolves.toEqual(record);
      expect(repo.deleteFinancialData).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.deleteFinancialData.mockResolvedValue(null);

      await expect(financialDataService.deleteFinancialData(ID)).rejects.toThrow(
        `Failed to delete financial data: Error: Financial data with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.deleteFinancialData.mockRejectedValue(new Error('timeout'));

      await expect(financialDataService.deleteFinancialData(ID)).rejects.toThrow(
        'Failed to delete financial data: Error: timeout',
      );
    });
  });

  describe('getAllFinancialData', () => {
    it('returns every record', async () => {
      const records = [buildFinancialData(), buildFinancialData({ id: OTHER_ID, month: 4 })];
      repo.getAllFinancialData.mockResolvedValue(records);

      await expect(financialDataService.getAllFinancialData()).resolves.toEqual(records);
    });

    it('returns an empty list when there are no records', async () => {
      repo.getAllFinancialData.mockResolvedValue([]);

      await expect(financialDataService.getAllFinancialData()).resolves.toEqual([]);
    });

    it('wraps repository errors', async () => {
      repo.getAllFinancialData.mockRejectedValue(new Error('timeout'));

      await expect(financialDataService.getAllFinancialData()).rejects.toThrow('Failed to fetch financial data: Error: timeout');
    });
  });

  describe('getFinancialDataById', () => {
    it('returns the matching record', async () => {
      const record = buildFinancialData();
      repo.getFinancialDataById.mockResolvedValue(record);

      await expect(financialDataService.getFinancialDataById(ID)).resolves.toEqual(record);
      expect(repo.getFinancialDataById).toHaveBeenCalledWith(ID);
    });

    it('throws a not-found error when the repository returns null', async () => {
      repo.getFinancialDataById.mockResolvedValue(null);

      await expect(financialDataService.getFinancialDataById(ID)).rejects.toThrow(
        `Failed to fetch financial data: Error: Financial data with id ${ID} not found`,
      );
    });

    it('wraps repository errors', async () => {
      repo.getFinancialDataById.mockRejectedValue(new Error('timeout'));

      await expect(financialDataService.getFinancialDataById(ID)).rejects.toThrow('Failed to fetch financial data: Error: timeout');
    });
  });
});
