import { apiRequest } from "@/lib/api/client";
import { learnedActionResponseSchema, learnedActionSchema, type LearnedAction } from "./schemas";

export function sendLearnedAction(input: LearnedAction) {
  return apiRequest("/api/preferences/learned", {
    method: "POST",
    body: learnedActionSchema.parse(input),
    schema: learnedActionResponseSchema,
  });
}