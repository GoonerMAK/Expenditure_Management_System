import {z} from "zod";

const EMPTY_NAME = "Category name can't be empty.";
const NAME_LENGTH = "Category name must be 3–20 characters.";

export const categoryParamsSchema = z.object({
    id: z.string().uuid({ message: "Invalid ID format. Must be a UUID." })
});

export const categorySchema = z.object({
    category_name: z.string({ required_error: EMPTY_NAME, invalid_type_error: EMPTY_NAME })
        .trim()
        .min(1, { message: EMPTY_NAME })
        .min(3, { message: NAME_LENGTH })
        .max(20, { message: NAME_LENGTH }),
});

export type CategoryParams = z.infer<typeof categoryParamsSchema>
export type Category = z.infer<typeof categorySchema>
