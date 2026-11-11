import { z } from "zod";

const toUtcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

const isRealDate = (value: string) => {
    const date = toUtcDate(value);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(value) && date.getUTCFullYear() >= 1900;
};

const dateOnly = z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Date must be in YYYY-MM-DD format" })
    .refine(isRealDate, { message: "Date must be a real date from 1900 or later" })
    .transform(toUtcDate);

const amount = z.coerce.number({ invalid_type_error: "Amount must be a number" })
    .positive({ message: "Amount must be greater than 0" })
    .max(1_000_000_000_000, { message: "Amount is too large" });

const vendor = z.string().trim()
    .min(1, { message: "Vendor cannot be empty" })
    .max(200, { message: "Vendor must be 200 characters or fewer" });

const notes = z.string().trim()
    .max(1000, { message: "Notes must be 1000 characters or fewer" })
    .transform((value) => value || null);

export const expenseEntryParamsSchema = z.object({
    id: z.string().uuid({ message: "Invalid ID format. Must be a UUID." })
});

export const createExpenseEntrySchema = z.object({
    project_id: z.string().uuid({ message: "Project ID must be a UUID" }),
    date: dateOnly,
    vendor,
    amount,
    notes: notes.optional(),
});

export const updateExpenseEntrySchema = z.object({
    date: dateOnly.optional(),
    vendor: vendor.optional(),
    amount: amount.optional(),
    notes: notes.optional(),
    remove_receipt: z.enum(['true', 'false'], { message: "remove_receipt must be 'true' or 'false'" })
        .optional()
        .transform((value) => value === 'true'),
});

export const rejectExpenseEntrySchema = z.object({
    rejection_reason: z.string().trim()
        .max(1000, { message: "Rejection reason must be 1000 characters or fewer" })
        .transform((value) => value || null)
        .optional(),
});

export type ExpenseEntryParams = z.infer<typeof expenseEntryParamsSchema>
export type NewExpenseEntry = z.infer<typeof createExpenseEntrySchema>
export type ExpenseEntryUpdate = z.infer<typeof updateExpenseEntrySchema>
export type ExpenseEntryRejection = z.infer<typeof rejectExpenseEntrySchema>
