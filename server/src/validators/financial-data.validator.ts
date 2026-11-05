import { z } from "zod";

export const financialDataParamsSchema = z.object({
    id: z.string().uuid({ message: "Invalid ID format. Must be a UUID." })
});

export const financialDataSchema = z.object({
    year: z.number().int().min(1900, { message: "Year must be 1900 or later" }).optional(),
    month: z.number().int().min(1).max(12, { message: "Month must be between 1 and 12" }).optional(),
    expenditure: z.number().nonnegative().optional(),
    initial_budget: z.number().nonnegative().optional(),
    revised_budget: z.number().nonnegative().nullable().optional(),
    project_id: z.string().uuid().optional(),
    project_name: z.string().min(1, { message: "Project name cannot be empty" }).optional(),
});

export type FinancialDataParams = z.infer<typeof financialDataParamsSchema>
export type FinancialData = z.infer<typeof financialDataSchema>