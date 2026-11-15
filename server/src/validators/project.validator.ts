import { z } from "zod";
import { paginationQuerySchema } from "./pagination.validator.js";

const datePreprocess = (arg: unknown) => {
    if (typeof arg === "string" || arg instanceof Date) {
        return new Date(arg);
    }
    return undefined;
};


export const projectParamsSchema = z.object({
    id: z.string().uuid({ message: "Invalid ID format. Must be a UUID." })
});

export const projectSchema = z.object({
    project_name: z.string().min(3, { message: "Project name must be at least 3 characters long" }),
    description: z.string().optional(),
    category_id: z.string().uuid().optional(),
    category_name: z.string().optional(),
    start_date: z.preprocess(datePreprocess, z.date().optional()),
    end_date: z.preprocess(datePreprocess, z.date().optional()),
});

export type ProjectParams = z.infer<typeof projectParamsSchema>
export type Project = z.infer<typeof projectSchema>

export const PROJECT_SORT_OPTIONS = ['name_asc', 'name_desc', 'start_date_desc', 'start_date_asc', 'spend_desc', 'spend_asc'] as const;

const filterDate = (label: string) => z.string()
    .date(`${label} must be a valid date in YYYY-MM-DD format`)
    .transform(val => new Date(val))
    .optional();

const isDateRangeInOrder = (query: { from?: Date; to?: Date }) => {
    if (!query.from || !query.to) {
        return true;
    }
    return query.from <= query.to;
};

export const projectListQuerySchema = paginationQuerySchema.extend({
    search: z.string()
        .trim()
        .max(100, { message: "Search must be at most 100 characters long" })
        .transform(val => val || undefined)
        .optional(),
    category: z.string().uuid({ message: "Category must be a valid ID" }).optional(),
    owner: z.string().uuid({ message: "Owner must be a valid ID" }).optional(),
    from: filterDate('From date'),
    to: filterDate('To date'),
    sort: z.enum(PROJECT_SORT_OPTIONS, {
        errorMap: () => ({ message: `Sort must be one of: ${PROJECT_SORT_OPTIONS.join(', ')}` }),
    }).optional(),
}).refine(isDateRangeInOrder, { message: "From date must be on or before the To date", path: ['from'] });

export type ProjectSort = typeof PROJECT_SORT_OPTIONS[number];
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>
export type ProjectListFilters = Omit<ProjectListQuery, 'offset' | 'limit' | 'sort'>
