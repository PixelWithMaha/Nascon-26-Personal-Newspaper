import { apiRequest } from "@/lib/api/client";
import {
  editionResponseSchema,
  feedbackInputSchema,
  feedbackResponseSchema,
  type FeedbackInput,
} from "./schemas";

export function generateEdition() {
  return apiRequest("/api/generate", {
    method: "POST",
    schema: editionResponseSchema,
    timeoutMs: 90_000,
  });
}

export function sendFeedback(input: FeedbackInput) {
  return apiRequest("/api/feedback", {
    method: "POST",
    body: feedbackInputSchema.parse(input),
    schema: feedbackResponseSchema,
    keepalive: true,
  });
}