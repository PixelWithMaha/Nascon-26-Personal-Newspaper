import { describe, expect, it } from "vitest";
import { preferencesSchema } from "./schemas";

const valid = {
  displayName: "Ayesha",
  topics: [
    { name: "AI", weight: 1 },
    { name: "Cricket", weight: 0.7 },
    { name: "Startups", weight: 0.4 },
  ],
  keywords: ["OpenAI"],
  blockedKeywords: ["celebrity"],
  sources: [{ type: "rss", url: "https://example.com/feed.xml" }],
  readingMinutes: 10,
  timezone: "Asia/Karachi",
};

describe("preferencesSchema", () => {
  it("accepts a complete profile", () => {
    expect(preferencesSchema.safeParse(valid).success).toBe(true);
  });

  it("requires at least 3 topics", () => {
    const result = preferencesSchema.safeParse({ ...valid, topics: valid.topics.slice(0, 2) });
    expect(result.success).toBe(false);
  });

  it("rejects the same topic twice", () => {
    const result = preferencesSchema.safeParse({
      ...valid,
      topics: [...valid.topics, { name: "ai", weight: 0.4 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a source that is not a URL", () => {
    const result = preferencesSchema.safeParse({ ...valid, sources: [{ type: "rss", url: "dawn" }] });
    expect(result.success).toBe(false);
  });
});