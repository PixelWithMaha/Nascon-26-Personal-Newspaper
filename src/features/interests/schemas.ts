import { z } from "zod";
import { preferencesSchema } from "@/features/onboarding/schemas";
import { feedbackSignalSchema } from "@/features/edition/schemas";

export const learnedItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(80),
  keyword: z.string().min(1).max(40),
  reason: z.string().max(200),
  evidence: z.array(z.string()).max(3),
  confirmed: z.boolean(),
  isNew: z.boolean(),
});

export const learnedProfileSchema = z.object({
  likes: z.array(learnedItemSchema).max(6),
  dislikes: z.array(learnedItemSchema).max(6),
  exploring: z.array(learnedItemSchema).max(6),
  dismissed: z.array(z.string()).max(100),
  updatedAt: z.string().nullable(),
});

export const EMPTY_PROFILE: z.infer<typeof learnedProfileSchema> = {
  likes: [],
  dislikes: [],
  exploring: [],
  dismissed: [],
  updatedAt: null,
};

export const signalRowSchema = z.object({
  createdAt: z.string(),
  signal: feedbackSignalSchema,
  topic: z.string(),
  headline: z.string().nullable(),
});

export const topicTrendSchema = z.enum(["rising", "cooling"]);

export const interestsDataSchema = z.object({
  preferences: preferencesSchema,
  learnedProfile: learnedProfileSchema,
  recentSignals: z.array(signalRowSchema),
  topicTrend: z.record(z.string(), topicTrendSchema),
});

export const learnedActionSchema = z.object({
  itemId: z.string().min(1).max(100),
  action: z.enum(["follow", "block", "dismiss"]),
});

export const learnedActionResponseSchema = z.object({
  preferences: preferencesSchema,
  learnedProfile: learnedProfileSchema,
});

export type LearnedItem = z.infer<typeof learnedItemSchema>;
export type LearnedProfile = z.infer<typeof learnedProfileSchema>;
export type SignalRow = z.infer<typeof signalRowSchema>;
export type TopicTrend = z.infer<typeof topicTrendSchema>;
export type InterestsData = z.infer<typeof interestsDataSchema>;
export type LearnedAction = z.infer<typeof learnedActionSchema>;