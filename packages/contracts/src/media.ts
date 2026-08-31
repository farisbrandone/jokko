import { z } from 'zod';

export const UploadUrlRequestSchema = z.object({
  contentType: z
    .string()
    .regex(/^(image\/(jpeg|png|webp|avif|gif)|video\/(mp4|webm))$/, 'type de média non autorisé'),
  filename: z.string().max(200).optional(),
});
export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;

export const UploadUrlResponseSchema = z.object({
  key: z.string(),
  uploadUrl: z.string().url(),
  uploadMethod: z.literal('PUT'),
  publicUrl: z.string().url(),
  expiresInSeconds: z.number().int().positive(),
});
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
