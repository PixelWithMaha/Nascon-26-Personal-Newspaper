import { describe, expect, it } from "vitest";
import type { Edition } from "@/features/edition/schemas";
import { renderEditionHtml } from "./pdf";

const story = (id: string, over: Partial<Edition["sections"][number]["stories"][number]> = {}) => ({
  id,
  articleId: `a-${id}`,
  headline: `Headline ${id}`,
  dek: "Dek",
  summary: "Summary text.",
  why: "Because you follow AI.",
  topic: "AI",
  size: "standard" as const,
  sourceName: "Example News",
  url: `https://example.com/${id}`,
  publishedAt: "2026-10-17T06:00:00.000Z",
  imageUrl: null,
  ...over,
});

const edition: Edition = {
  editionDate: "2026-10-17",
  masthead: { title: "The Morning Paper", tagline: "All the news that fits you", readerName: "Maha" },
  editorNote: "Good morning, Maha.",
  leadStoryId: "s1",
  sections: [
    {
      name: "Technology",
      stories: [
        story("s1", { size: "lead", headline: "<script>alert(1)</script> AI wins" }),
        story("s2"),
        story("s3", { size: "brief", url: "javascript:alert(1)" }),
      ],
    },
  ],
};

describe("renderEditionHtml", () => {
  const html = renderEditionHtml(edition);

  it("prints the masthead, reader and date", () => {
    expect(html).toContain("The Morning Paper");
    expect(html).toContain("Personal edition for Maha");
    expect(html).toContain("Saturday, October 17, 2026");
  });

  it("escapes story text", () => {
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("links to originals and refuses non-http links", () => {
    expect(html).toContain('href="https://example.com/s2"');
    expect(html).not.toContain("javascript:alert");
  });

  it("puts briefs in the briefs box", () => {
    expect(html).toContain('class="briefs"');
  });
});