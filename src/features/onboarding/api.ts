import { apiRequest } from "@/lib/api/client";
import { preferencesResponseSchema, preferencesSchema, type Preferences } from "./schemas";

export function fetchPreferences() {
  return apiRequest("/api/preferences", { schema: preferencesResponseSchema });
}

export function savePreferences(input: Preferences) {
  return apiRequest("/api/preferences", {
    method: "POST",
    body: preferencesSchema.parse(input),
    schema: preferencesResponseSchema,
  });
}