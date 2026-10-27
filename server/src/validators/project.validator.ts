import { z } from "zod";

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