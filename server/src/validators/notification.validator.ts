import { z } from "zod";

export const notificationParamsSchema = z.object({
    id: z.string().uuid({ message: "Invalid ID format. Must be a UUID." })
});

export type NotificationParams = z.infer<typeof notificationParamsSchema>
