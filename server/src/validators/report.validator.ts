import { z } from "zod";

export const REPORT_PERIODS = ['monthly', 'yearly'] as const;
export const REPORT_FORMATS = ['csv', 'pdf'] as const;
export const UNCATEGORISED_REPORT_ID = 'uncategorised';

const isUuid = (value: string) => z.string().uuid().safeParse(value).success;

export const categoryReportParamsSchema = z.object({
    id: z.string().refine((value) => value === UNCATEGORISED_REPORT_ID || isUuid(value), {
        message: `Invalid ID format. Must be a UUID or ${UNCATEGORISED_REPORT_ID}.`,
    }),
});

export const reportQuerySchema = z.object({
    period: z.enum(REPORT_PERIODS, {
        errorMap: () => ({ message: `Period must be one of: ${REPORT_PERIODS.join(', ')}` }),
    }).default('monthly'),
    format: z.enum(REPORT_FORMATS, {
        errorMap: () => ({ message: `Format must be one of: ${REPORT_FORMATS.join(', ')}` }),
    }).default('csv'),
    year: z.string()
        .transform(val => parseInt(val, 10))
        .refine(val => !isNaN(val) && val >= 1900 && val <= 9999, { message: "Year must be between 1900 and 9999" })
        .optional(),
});

export type ReportPeriod = typeof REPORT_PERIODS[number];
export type ReportFormat = typeof REPORT_FORMATS[number];
export type CategoryReportParams = z.infer<typeof categoryReportParamsSchema>
export type ReportQuery = z.infer<typeof reportQuerySchema>
