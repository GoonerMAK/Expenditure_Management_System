import { z } from "zod";

export const paginationQuerySchema = z.object({
    offset: z.string()
        .default('0')
        .transform(val => parseInt(val, 10))
        .refine(val => !isNaN(val) && val >= 0, { message: "Offset must be a non-negative number" }),
    
    limit: z.string()
        .default('6')
        .transform(val => parseInt(val, 10))
        .refine(val => !isNaN(val) && val > 0 && val <= 100, { 
            message: "Limit must be between 1 and 100"
        }),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;