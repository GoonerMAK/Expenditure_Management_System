import axios from 'axios';
import { downloadReport, getReportFileName } from '../../src/lib/download-report';

jest.mock('axios');

const mockedGet = jest.mocked(axios.get);

describe('getReportFileName', () => {
  it('reads the file name the server sends', () => {
    expect(getReportFileName('attachment; filename="bridge-monthly-2026.pdf"', 'pdf')).toBe('bridge-monthly-2026.pdf');
  });

  it.each([undefined, 'attachment', 'attachment; filename=""'])('falls back to a generic name for %p', (header) => {
    expect(getReportFileName(header, 'csv')).toBe('report.csv');
  });
});

describe('downloadReport', () => {
  const file = new Blob(['csv content'], { type: 'text/csv' });
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let click: jest.SpyInstance;

  beforeEach(() => {
    createObjectURL = jest.fn().mockReturnValue('blob:report');
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    mockedGet.mockResolvedValue({
      data: file,
      headers: { 'content-disposition': 'attachment; filename="roads-yearly-2026.csv"' },
    });
  });

  it('requests the report with credentials and saves it under the server file name', async () => {
    await downloadReport({ subject: 'categories', id: 'c1', period: 'yearly', format: 'csv', year: '2026' });

    expect(mockedGet).toHaveBeenCalledWith('http://localhost:4000/api/reports/categories/c1', {
      params: { period: 'yearly', format: 'csv', year: '2026' },
      responseType: 'blob',
      withCredentials: true,
    });
    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(click).toHaveBeenCalledTimes(1);
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('roads-yearly-2026.csv');
    expect(link.href).toBe('blob:report');
    expect(document.body.contains(link)).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });

  it('leaves out the year when every year is wanted', async () => {
    await downloadReport({ subject: 'projects', id: 'p1', period: 'monthly', format: 'pdf', year: '' });

    expect(mockedGet).toHaveBeenCalledWith('http://localhost:4000/api/reports/projects/p1', expect.objectContaining({
      params: { period: 'monthly', format: 'pdf' },
    }));
  });

  it('saves nothing when the request fails', async () => {
    mockedGet.mockRejectedValue(new Error('500'));

    await expect(downloadReport({ subject: 'projects', id: 'p1', period: 'monthly', format: 'pdf' })).rejects.toThrow('500');
    expect(click).not.toHaveBeenCalled();
  });
});
