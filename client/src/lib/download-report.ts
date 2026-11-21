import axios from 'axios';

const REPORTS_URL = 'http://localhost:4000/api/reports';

export type ReportSubject = 'projects' | 'categories';
export type ReportPeriod = 'monthly' | 'yearly';
export type ReportFormat = 'csv' | 'pdf';

export interface ReportRequest {
  subject: ReportSubject;
  id: string;
  period: ReportPeriod;
  format: ReportFormat;
  year?: string;
}

export const UNCATEGORISED_REPORT_ID = 'uncategorised';

export const getReportFileName = (contentDisposition: string | undefined, format: ReportFormat) =>
  contentDisposition?.split('filename="')[1]?.split('"')[0] || `report.${format}`;

const saveFile = (file: Blob, fileName: string) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const downloadReport = async ({ subject, id, period, format, year }: ReportRequest) => {
  const response = await axios.get(`${REPORTS_URL}/${subject}/${id}`, {
    params: year ? { period, format, year } : { period, format },
    responseType: 'blob',
    withCredentials: true,
  });
  saveFile(response.data, getReportFileName(response.headers['content-disposition'], format));
};
