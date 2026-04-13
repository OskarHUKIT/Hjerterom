import { z } from "https://esm.sh/zod@3.23.8"

/** Validering av Supabase webhook / Database webhook payload for notifications → push / e-post. */
export const notificationRecordWebhookSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  type: z.string().max(120).optional(),
  title: z.string().max(500),
  message: z.string().max(12000),
  status: z.string().max(40).optional(),
  listing_id: z.string().uuid().nullable().optional(),
  related_user_id: z.string().uuid().nullable().optional(),
})

export const notificationWebhookPayloadSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string().max(120),
  schema: z.string().max(120),
  record: notificationRecordWebhookSchema,
  old_record: notificationRecordWebhookSchema.nullable().optional(),
})
