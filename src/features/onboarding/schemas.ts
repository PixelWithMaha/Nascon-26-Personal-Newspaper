import { z } from "zod";

export const topicSchema = z.object({
  name: z.string().trim().min(1).max(40),
  weight: z.number().min(0.05).max(1),
});

export const sourceSchema = z.object({
  type: z.enum(["rss", "site"]),
  url: z.url("Enter a full URL, starting with https://"),
});

const tagList = z.array(z.string().trim().min(1).max(40)).max(20);

export const preferencesSchema = z.object({
  displayName: z.string().trim().min(1, "Tell us your name").max(40, "Keep it under 40 characters"),
  topics: z
    .array(topicSchema)
    .min(3, "Pick at least 3 topics")
    .max(12, "Pick up to 12 topics")
    .refine(
      (topics) => new Set(topics.map((t) => t.name.toLowerCase())).size === topics.length,
      "Each topic can only be picked once",
    ),
  keywords: tagList,
  blockedKeywords: tagList,
  sources: z.array(sourceSchema).max(10),
  readingMinutes: z.number().int().min(1).max(60),
  timezone: z.string().min(1),
});

export type Topic = z.infer<typeof topicSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;

export const preferencesResponseSchema = z.object({
  preferences: preferencesSchema.nullable(),
});
export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;