import * as reportController from '../../../src/controllers/report.controller.js';
import * as reportService from '../../../src/services/report.service.js';
import * as reportFileService from '../../../src/services/report-file.service.js';
import { Report } from '../../../src/services/report.service.js';
import { ID } from '../helpers/factories.js';
import { expectResponse, mockRequest, mockResponse, MockResponse } from '../helpers/express.js';

jest.mock('../../../src/services/report.service.js');
jest.mock('../../../src/services/report-file.service.js');

const service = jest.mocked(reportService);
const files = jest.mocked(reportFileService);

const REPORT: Report = {
  subject: 'Project',
  name: 'Bridge',
  period: 'monthly',
  year: 2026,
  rows: [],
  total: { budget: 0, spent: 0, remaining: 0, percent_used: null, over_budget: false },
};

type FileResponse = MockResponse & { setHeader: jest.Mock; type: jest.Mock; send: jest.Mock };

const mockFileResponse = () => {
  const res = mockResponse() as FileResponse;
  res.setHeader = jest.fn();
  res.type = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const reportExports = [
  { name: 'exportProjectReport', handler: reportController.exportProjectReport, build: service.getProjectReport, label: 'Project' },
  { name: 'exportCategoryReport', handler: reportController.exportCategoryReport, build: service.getCategoryReport, label: 'Category' },
] as const;

describe('report.controller', () => {
  beforeEach(() => {
    files.toReportFileName.mockReturnValue('bridge-monthly-2026.csv');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe.each(reportExports)('$name', ({ handler, build, label }) => {
    it('sends the report as a CSV download', async () => {
      build.mockResolvedValue(REPORT);
      files.toCsv.mockReturnValue('csv content');
      const res = mockFileResponse();

      await handler(mockRequest({ params: { id: ID }, query: { period: 'monthly', year: 2026, format: 'csv' } }), res);

      expect(build).toHaveBeenCalledWith(ID, { period: 'monthly', year: 2026 });
      expect(files.toReportFileName).toHaveBeenCalledWith(REPORT, 'csv');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="bridge-monthly-2026.csv"');
      expect(res.type).toHaveBeenCalledWith('text/csv');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('csv content');
      expect(files.toPdf).not.toHaveBeenCalled();
    });

    it('sends the report as a PDF download', async () => {
      const pdf = Buffer.from('%PDF-');
      build.mockResolvedValue(REPORT);
      files.toPdf.mockResolvedValue(pdf);
      const res = mockFileResponse();

      await handler(mockRequest({ params: { id: ID }, query: { period: 'yearly', format: 'pdf' } }), res);

      expect(build).toHaveBeenCalledWith(ID, { period: 'yearly', year: undefined });
      expect(files.toPdf).toHaveBeenCalledWith(REPORT);
      expect(res.type).toHaveBeenCalledWith('application/pdf');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(pdf);
      expect(files.toCsv).not.toHaveBeenCalled();
    });

    it(`responds 404 when the ${label.toLowerCase()} does not exist`, async () => {
      build.mockResolvedValue(null);
      const res = mockFileResponse();

      await handler(mockRequest({ params: { id: ID }, query: { period: 'monthly', format: 'csv' } }), res);

      expectResponse(res, 404, { error: `${label} with id ${ID} not found` });
      expect(res.send).not.toHaveBeenCalled();
    });

    it('responds 500 when the report cannot be built', async () => {
      build.mockRejectedValue(new Error('boom'));
      const res = mockFileResponse();

      await handler(mockRequest({ params: { id: ID }, query: { period: 'monthly', format: 'csv' } }), res);

      expectResponse(res, 500, { error: 'boom' });
    });

    it('responds 500 when the PDF cannot be created', async () => {
      build.mockResolvedValue(REPORT);
      files.toPdf.mockRejectedValue(new Error('pdf failed'));
      const res = mockFileResponse();

      await handler(mockRequest({ params: { id: ID }, query: { period: 'monthly', format: 'pdf' } }), res);

      expectResponse(res, 500, { error: 'pdf failed' });
      expect(res.send).not.toHaveBeenCalled();
    });
  });
});
