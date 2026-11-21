import * as projectRepository from '../repositories/project.repository.js';
import * as categoryRepository from '../repositories/category.repository.js';
import { getUncategorisedLabel } from '../categories.js';
import { FinancialEntry, groupEntriesByPeriod, sumBudget, sumSpent, toBudgetTotals } from '../budget.js';
import { ReportPeriod, UNCATEGORISED_REPORT_ID } from '../validators/report.validator.js';

export type ReportSubject = 'Project' | 'Category';

export type ReportOptions = {
    period: ReportPeriod;
    year?: number;
};

type DatedEntry = FinancialEntry & {
    year: number;
    month: number;
};

type ReportTotals = ReturnType<typeof toBudgetTotals>;

export type ReportRow = ReportTotals & {
    period: string;
};

export type Report = {
    subject: ReportSubject;
    name: string;
    period: ReportPeriod;
    year: number | null;
    rows: ReportRow[];
    total: ReportTotals;
};

const toPeriodLabel = (period: ReportPeriod, entry: DatedEntry) =>
    period === 'monthly' ? `${entry.year}-${String(entry.month).padStart(2, '0')}` : String(entry.year);

const toTotals = (entries: FinancialEntry[]) => toBudgetTotals(sumBudget(entries), sumSpent(entries));

const buildReport = (subject: ReportSubject, name: string, entries: DatedEntry[], { period, year }: ReportOptions): Report => {
    const rows = groupEntriesByPeriod(entries, (entry) => toPeriodLabel(period, entry)).map((items) => ({
        period: toPeriodLabel(period, items[0]),
        ...toTotals(items),
    }));

    return {
        subject,
        name,
        period,
        year: year ?? null,
        rows,
        total: toTotals(entries),
    };
};

export const getProjectReport = async (id: string, options: ReportOptions) => {
    try {
        const project = await projectRepository.getProjectById(id);
        if (!project) {
            return null;
        }
        const entries = await projectRepository.getProjectFinancialData(id, options.year);
        return buildReport('Project', project.project_name, entries, options);
    } catch (error) {
        throw new Error(`Failed to build project report: ${error}`);
    }
};

const findReportCategory = async (id: string) => {
    if (id === UNCATEGORISED_REPORT_ID) {
        return { id: null, category_name: getUncategorisedLabel() };
    }
    return await categoryRepository.getCategoryById(id);
};

export const getCategoryReport = async (id: string, options: ReportOptions) => {
    try {
        const category = await findReportCategory(id);
        if (!category) {
            return null;
        }
        const entries = await projectRepository.getCategoryFinancialData(category.id, options.year);
        return buildReport('Category', category.category_name, entries, options);
    } catch (error) {
        throw new Error(`Failed to build category report: ${error}`);
    }
};
