import { z } from "zod";

export const editionSummarySchema = z.object({
  id: z.uuid(),
  editionDate: z.string(),
  readerName: z.string(),
  tagline: z.string(),
  leadTopic: z.string(),
  leadHeadline: z.string(),
  leadDek: z.string(),
  sections: z.array(z.object({ name: z.string(), headline: z.string() })).max(4),
  storyCount: z.number().int(),
  hasPdf: z.boolean(),
});

export const editionListResponseSchema = z.object({ editions: z.array(editionSummarySchema) });

export type EditionSummary = z.infer<typeof editionSummarySchema>;