import { Request, Response } from 'express';
import * as reportService from '../services/report.service.js';
import * as reportFileService from '../services/report-file.service.js';
import { Report } from '../services/report.service.js';
import { ProjectParams } from '../validators/project.validator.js';
import { CategoryReportParams, ReportFormat, ReportQuery } from '../validators/report.validator.js';

const sendReport = async (res: Response, report: Report, format: ReportFormat) => {
    res.setHeader('Content-Disposition', `attachment; filename="${reportFileService.toReportFileName(report, format)}"`);
    if (format === 'pdf') {
        const pdf = await reportFileService.toPdf(report);
        res.type('application/pdf');
        res.status(200).send(pdf);
    } else {
        res.type('text/csv');
        res.status(200).send(reportFileService.toCsv(report));
    }
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
