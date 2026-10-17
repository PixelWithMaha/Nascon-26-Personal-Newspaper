import { z } from "zod";

export const storySizeSchema = z.enum(["lead", "feature", "standard", "brief"]);

export const storySchema = z.object({
  id: z.string(),
  articleId: z.string(),
  headline: z.string().min(1),
  dek: z.string(),
  summary: z.string().min(1),
  why: z.string(),
  topic: z.string(),
  size: storySizeSchema,
  sourceName: z.string(),
  url: z.url(),
  publishedAt: z.string(),
  imageUrl: z.string().nullable(),
  imageCredit: z.string().nullable().optional(),
});

export const editionSchema = z.object({
  editionDate: z.string(),
  masthead: z.object({
    title: z.string(),
    tagline: z.string(),
    readerName: z.string(),
  }),
  editorNote: z.string(),
  leadStoryId: z.string(),
  sections: z
    .array(z.object({ name: z.string().min(1), stories: z.array(storySchema).min(1) }))
    .min(1),
});

export const editionResponseSchema = z.object({ edition: editionSchema });

export type StorySize = z.infer<typeof storySizeSchema>;
export type Story = z.infer<typeof storySchema>;
export type Edition = z.infer<typeof editionSchema>;

export const feedbackSignalSchema = z.enum(["like", "dislike", "skip", "less_like_this", "click", "read"]);

export const feedbackInputSchema = z.object({
  editionId: z.uuid(),
  storyId: z.string().min(1).max(20),
  signal: feedbackSignalSchema,
  value: z.number().min(0).max(36_000).optional(),
});

export const feedbackResponseSchema = z.object({
  recorded: z.boolean(),
  topic: z.string().nullable(),
  weight: z.number().nullable(),
});

export type FeedbackSignal = z.infer<typeof feedbackSignalSchema>;
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;