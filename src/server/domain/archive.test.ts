import { describe, expect, it } from "vitest";
import type { Edition } from "@/features/edition/schemas";
import { toSummary } from "./archive";

const story = (id: string, headline: string, size: "lead" | "standard" = "standard") => ({
  id,
  articleId: `a-${id}`,
  headline,
  dek: "Dek",
  summary: "Summary.",
  why: "",
  topic: "AI",
  size,
  sourceName: "Example",
  url: `https://example.com/${id}`,
  publishedAt: "2026-10-17T06:00:00.000Z",
  imageUrl: null,
});

const edition: Edition = {
  editionDate: "2026-10-17",
  masthead: { title: "The Morning Paper", tagline: "Fit to read", readerName: "Maha" },
  editorNote: "Morning.",
  leadStoryId: "s1",
  sections: [
    { name: "Tech", stories: [story("s1", "Lead story", "lead"), story("s2", "Second tech")] },
    { name: "Cars", stories: [story("s3", "Car story")] },
  ],
};

describe("toSummary", () => {
  it("builds a front-page thumbnail without repeating the lead", () => {
        const s = toSummary("id-1", "2026-10-17", edition, false);
    expect(s.leadHeadline).toBe("Lead story");
    expect(s.sections).toEqual([
      { name: "Tech", headline: "Second tech" },
      { name: "Cars", headline: "Car story" },
    ]);
    expect(s.storyCount).toBe(3);
  });
});