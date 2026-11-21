import PDFDocument from 'pdfkit';
import { toCsv, toPdf, toReportFileName } from '../../../src/services/report-file.service.js';
import { Report } from '../../../src/services/report.service.js';

const buildReport = (overrides: Partial<Report> = {}): Report => ({
  subject: 'Project',
  name: 'Bridge',
  period: 'monthly',
  year: 2026,
  rows: [
    { period: '2026-01', budget: 1200, spent: 250.5, remaining: 949.5, percent_used: 20.9, over_budget: false },
    { period: '2026-03', budget: 1000, spent: 1300, remaining: -300, percent_used: 130, over_budget: true },
  ],
  total: { budget: 2200, spent: 1550.5, remaining: 649.5, percent_used: 70.5, over_budget: false },
  ...overrides,
});

const writtenText = (spy: jest.SpyInstance) => spy.mock.calls.map(([text]) => text);

describe('report-file.service', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('toCsv', () => {
    it('writes the report details, one line per period and a total line', () => {
      expect(toCsv(buildReport())).toBe(
        '﻿"Project","Bridge"\r\n'
        + '"Period","Monthly"\r\n'
        + '"Year",2026\r\n'
        + '\r\n'
        + '"Period","Budget","Spent","Remaining","% used","Over budget"\r\n'
        + '"2026-01",1200,250.5,949.5,20.9,"No"\r\n'
        + '"2026-03",1000,1300,-300,130,"Yes"\r\n'
        + '"Total",2200,1550.5,649.5,70.5,"No"\r\n',
      );
    });

    it('describes a yearly report over all years', () => {
      const csv = toCsv(buildReport({ subject: 'Category', name: 'Roads', period: 'yearly', year: null }));

      expect(csv).toContain('"Category","Roads"\r\n"Period","Yearly"\r\n"Year","All years"\r\n');
    });

    it('leaves the percentage empty when there is no budget', () => {
      const csv = toCsv(buildReport({
        rows: [],
        total: { budget: 0, spent: 0, remaining: 0, percent_used: null, over_budget: false },
      }));

      expect(csv).toContain('"Total",0,0,0,"","No"\r\n');
    });

    it('escapes quotes and keeps names from running as spreadsheet formulas', () => {
      expect(toCsv(buildReport({ name: 'The "Big" Bridge' }))).toContain('"Project","The ""Big"" Bridge"');
      expect(toCsv(buildReport({ name: '=SUM(A1)' }))).toContain('"Project","\'=SUM(A1)"');
    });

    it('keeps names that start with a tab or a line break from running as formulas', () => {
      expect(toCsv(buildReport({ name: '\t=SUM(A1)' }))).toContain('"Project","\'\t=SUM(A1)"');
      expect(toCsv(buildReport({ name: '\r=SUM(A1)' }))).toContain('"Project","\'\r=SUM(A1)"');
    });
  });

  describe('toPdf', () => {
    it('creates a PDF with the title, the period and every row', async () => {
      const text = jest.spyOn(PDFDocument.prototype, 'text');

      const pdf = await toPdf(buildReport());

      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(writtenText(text)).toEqual(expect.arrayContaining([
        'Project report: Bridge',
        'Monthly, 2026',
        'Period',
        'Over budget',
        '2026-01',
        '1,200',
        '250.5',
        '20.9%',
        '-300',
        'Yes',
        'Total',
        '1,550.5',
      ]));
    });

    it('embeds a font that can show Bangla names', async () => {
      const registerFont = jest.spyOn(PDFDocument.prototype, 'registerFont');

      const pdf = await toPdf(buildReport({ name: 'সেতু প্রকল্প' }));

      expect(registerFont).toHaveBeenCalledWith('Body', expect.stringMatching(/HindSiliguri-Regular\.ttf$/));
      expect(registerFont).toHaveBeenCalledWith('Bold', expect.stringMatching(/HindSiliguri-Bold\.ttf$/));
      expect(pdf.toString('latin1')).toContain('HindSiliguri');
    });

    it('shows N/A for the percentage when there is no budget', async () => {
      const text = jest.spyOn(PDFDocument.prototype, 'text');

      await toPdf(buildReport({
        rows: [{ period: '2026', budget: 0, spent: 10, remaining: -10, percent_used: null, over_budget: true }],
        period: 'yearly',
        year: null,
      }));

      expect(writtenText(text)).toEqual(expect.arrayContaining(['Yearly, All years', 'N/A']));
    });

    it('says when there is no data instead of drawing an empty table', async () => {
      const text = jest.spyOn(PDFDocument.prototype, 'text');

      await toPdf(buildReport({ rows: [] }));

      expect(writtenText(text)).toContain('No budget data for this period.');
      expect(writtenText(text)).not.toContain('Total');
    });

    it('continues on a new page with the column titles when the rows do not fit', async () => {
      const text = jest.spyOn(PDFDocument.prototype, 'text');
      const addPage = jest.spyOn(PDFDocument.prototype, 'addPage');
      const row = { period: '2026-01', budget: 1, spent: 1, remaining: 0, percent_used: 100, over_budget: false };

      await toPdf(buildReport({ rows: Array.from({ length: 60 }, () => row) }));

      expect(addPage).toHaveBeenCalledTimes(2);
      expect(writtenText(text).filter((value) => value === 'Period')).toHaveLength(2);
    });
  });

  describe('toReportFileName', () => {
    it('names the file after the report', () => {
      expect(toReportFileName(buildReport({ name: 'Bridge Renovation (Phase 2)' }), 'pdf')).toBe(
        'bridge-renovation-phase-2-monthly-2026.pdf',
      );
    });

    it('uses all-years when no year is chosen', () => {
      expect(toReportFileName(buildReport({ period: 'yearly', year: null }), 'csv')).toBe('bridge-yearly-all-years.csv');
    });

    it('keeps only plain letters and digits, and falls back to report', () => {
      expect(toReportFileName(buildReport({ name: 'Ünïcødé' }), 'csv')).toBe('n-c-d-monthly-2026.csv');
      expect(toReportFileName(buildReport({ name: '***' }), 'csv')).toBe('report-monthly-2026.csv');
    });
  });
});
