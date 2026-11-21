import path from 'path';
import PDFDocument from 'pdfkit';
import { Report, ReportRow } from './report.service.js';
import { ReportFormat } from '../validators/report.validator.js';

type ReportTotals = Report['total'];

const PAGE_MARGIN = 50;
const ROW_HEIGHT = 20;
const TABLE_WIDTH = 495;
const FONT_DIR = path.resolve('assets', 'fonts');
const BODY_FONT = 'Body';
const BOLD_FONT = 'Bold';
const FORMULA_STARTS = ['=', '+', '-', '@', '\t', '\r'];

const COLUMNS = [
    { title: 'Period', x: 0, width: 115, align: 'left' },
    { title: 'Budget', x: 115, width: 80, align: 'right' },
    { title: 'Spent', x: 195, width: 80, align: 'right' },
    { title: 'Remaining', x: 275, width: 80, align: 'right' },
    { title: '% used', x: 355, width: 65, align: 'right' },
    { title: 'Over budget', x: 420, width: 75, align: 'right' },
] as const;

const getColumnTitles = () => COLUMNS.map((column) => column.title);

const formatAmount = (amount: number) => amount.toLocaleString('en-US', { maximumFractionDigits: 2 });

const formatPercent = (percent: number | null) => percent === null ? 'N/A' : `${percent}%`;

const formatOverBudget = (overBudget: boolean) => overBudget ? 'Yes' : 'No';

const formatPeriodType = (report: Report) => report.period === 'monthly' ? 'Monthly' : 'Yearly';

const formatYear = (report: Report) => report.year ?? 'All years';

const toCsvCell = (value: string | number) => {
    if (typeof value === 'number') {
        return String(value);
    }
    const safeValue = FORMULA_STARTS.includes(value.charAt(0)) ? `'${value}` : value;
    return `"${safeValue.split('"').join('""')}"`;
};

const toCsvLine = (cells: (string | number)[]) => cells.map(toCsvCell).join(',');

const toCsvValues = (totals: ReportTotals) => [
    totals.budget,
    totals.spent,
    totals.remaining,
    totals.percent_used ?? '',
    formatOverBudget(totals.over_budget),
];

export const toCsv = (report: Report) => {
    const lines = [
        toCsvLine([report.subject, report.name]),
        toCsvLine(['Period', formatPeriodType(report)]),
        toCsvLine(['Year', formatYear(report)]),
        '',
        toCsvLine(getColumnTitles()),
        ...report.rows.map((row) => toCsvLine([row.period, ...toCsvValues(row)])),
        toCsvLine(['Total', ...toCsvValues(report.total)]),
    ];
    return `﻿${lines.join('\r\n')}\r\n`;
};

const toPdfCells = (label: string, totals: ReportTotals) => [
    label,
    formatAmount(totals.budget),
    formatAmount(totals.spent),
    formatAmount(totals.remaining),
    formatPercent(totals.percent_used),
    formatOverBudget(totals.over_budget),
];

const drawCells = (doc: PDFKit.PDFDocument, cells: string[], font: string) => {
    const top = doc.y;
    doc.font(font);
    COLUMNS.forEach((column, index) => {
        doc.text(cells[index], PAGE_MARGIN + column.x, top, { width: column.width, align: column.align });
    });
    doc.x = PAGE_MARGIN;
    doc.y = top + ROW_HEIGHT;
};

const drawHeader = (doc: PDFKit.PDFDocument) => {
    drawCells(doc, getColumnTitles(), BOLD_FONT);
    const lineY = doc.y - ROW_HEIGHT / 3;
    doc.moveTo(PAGE_MARGIN, lineY).lineTo(PAGE_MARGIN + TABLE_WIDTH, lineY).strokeColor('#cccccc').stroke();
};

const needsNewPage = (doc: PDFKit.PDFDocument) => doc.y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN;

const drawRow = (doc: PDFKit.PDFDocument, cells: string[], font: string) => {
    if (needsNewPage(doc)) {
        doc.addPage();
        drawHeader(doc);
    }
    drawCells(doc, cells, font);
};

const drawTable = (doc: PDFKit.PDFDocument, rows: ReportRow[], total: ReportTotals) => {
    drawHeader(doc);
    rows.forEach((row) => drawRow(doc, toPdfCells(row.period, row), BODY_FONT));
    drawRow(doc, toPdfCells('Total', total), BOLD_FONT);
};

const toReportTitle = (report: Report) => `${report.subject} report: ${report.name}`;

const registerFonts = (doc: PDFKit.PDFDocument) => {
    doc.registerFont(BODY_FONT, path.join(FONT_DIR, 'HindSiliguri-Regular.ttf'));
    doc.registerFont(BOLD_FONT, path.join(FONT_DIR, 'HindSiliguri-Bold.ttf'));
};

export const toPdf = (report: Report) => new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, info: { Title: toReportTitle(report) } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    registerFonts(doc);

    doc.font(BOLD_FONT).fontSize(16).text(toReportTitle(report));
    doc.font(BODY_FONT).fontSize(10).fillColor('#555555').text(`${formatPeriodType(report)}, ${formatYear(report)}`);
    doc.fillColor('#000000').moveDown(1.5);

    if (report.rows.length === 0) {
        doc.text('No budget data for this period.');
    } else {
        drawTable(doc, report.rows, report.total);
    }
    doc.end();
});

const toFileSlug = (name: string) =>
    name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join('-') || 'report';

export const toReportFileName = (report: Report, format: ReportFormat) =>
    `${toFileSlug(report.name)}-${report.period}-${report.year ?? 'all-years'}.${format}`;
