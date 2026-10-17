import { describe, expect, it } from "vitest";
import { assembleEdition, targetStoryCount, type ModelEdition } from "./curate";
import type { Article } from "./ingest";
import type { StorySize } from "@/features/edition/schemas";

const article = (id: string): Article => ({
  id,
  title: `Title ${id}`,
  url: `https://example.com/${id}`,
  source: "Example News",
  topic: "AI",
  publishedAt: "2026-10-17T06:00:00.000Z",
  snippet: "Snippet",
  imageUrl: null,
});

const story = (article_id: string, size: StorySize = "standard") => ({
  article_id,
  headline: `Headline ${article_id}`,
  dek: "Dek",
  summary: "Summary",
  why: "Because you follow AI.",
  topic: "AI",
  size,
  image_query: "BMW",
});

const output = (stories: ReturnType<typeof story>[]): ModelEdition => ({
  tagline: "All the news that fits you",
  editor_note: "Good morning.",
  sections: [{ name: "Technology", stories }],
});

const ctx = { editionDate: "2026-10-17", readerName: "Ayesha", maxStories: 10 };
const articles = ["a", "b", "c"].map(article);

describe("targetStoryCount", () => {
  it("maps reading time to story count", () => {
    expect([5, 10, 15, 20].map(targetStoryCount)).toEqual([6, 10, 14, 18]);
  });
});

describe("assembleEdition", () => {
  it("drops article ids we never sent", () => {
    const edition = assembleEdition(output([story("a"), story("made-up")]), articles, ctx);
    expect(edition.sections[0].stories.map((s) => s.articleId)).toEqual(["a"]);
  });

  it("takes url and source from our data, not the model", () => {
    const edition = assembleEdition(output([story("b")]), articles, ctx);
    const [s] = edition.sections[0].stories;
    expect(s.url).toBe("https://example.com/b");
    expect(s.sourceName).toBe("Example News");
  });

  it("ensures exactly one lead", () => {
    const edition = assembleEdition(
      output([story("a", "lead"), story("b", "lead"), story("c")]),
      articles,
      ctx,
    );
    const leads = edition.sections.flatMap((s) => s.stories).filter((s) => s.size === "lead");
    expect(leads).toHaveLength(1);
    expect(edition.leadStoryId).toBe(leads[0].id);
  });

  it("respects the story cap", () => {
    const edition = assembleEdition(output(["a", "b", "c"].map((id) => story(id))), articles, {
      ...ctx,
      maxStories: 2,
    });
    expect(edition.sections.flatMap((s) => s.stories)).toHaveLength(2);
  });
});