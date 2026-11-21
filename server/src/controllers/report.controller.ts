import { Request, Response } from 'express';
import * as reportService from '../services/report.service.js';
import * as reportFileService from '../services/report-file.service.js';
import { Report } from '../services/report.service.js';
import { ProjectParams } from '../validators/project.validator.js';
import { CategoryReportParams, ReportFormat, ReportQuery } from '../validators/report.validator.js';

const CONTENT_TYPES: Record<ReportFormat, string> = {
    csv: 'text/csv',
    pdf: 'application/pdf',
};

const buildFile = async (report: Report, format: ReportFormat) =>
    format === 'pdf' ? await reportFileService.toPdf(report) : reportFileService.toCsv(report);

const sendReport = async (res: Response, report: Report, format: ReportFormat) => {
    const file = await buildFile(report, format);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFileService.toReportFileName(report, format)}"`);
    res.type(CONTENT_TYPES[format]);
    res.status(200).send(file);
};

export const exportProjectReport = async (req: Request<ProjectParams, unknown, unknown, ReportQuery>, res: Response) => {
    const { id } = req.params;
    const { period, year, format } = req.query;
    try {
        const report = await reportService.getProjectReport(id, { period, year });
        if (!report) {
            res.status(404).json({ error: `Project with id ${id} not found` });
        } else {
            await sendReport(res, report, format);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const exportCategoryReport = async (req: Request<CategoryReportParams, unknown, unknown, ReportQuery>, res: Response) => {
    const { id } = req.params;
    const { period, year, format } = req.query;
    try {
        const report = await reportService.getCategoryReport(id, { period, year });
        if (!report) {
            res.status(404).json({ error: `Category with id ${id} not found` });
        } else {
            await sendReport(res, report, format);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
