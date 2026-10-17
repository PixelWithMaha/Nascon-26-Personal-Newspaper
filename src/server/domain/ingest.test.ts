import { describe, expect, it } from "vitest";
import { cleanTitle, planFeeds, selectArticles } from "./ingest";

const now = new Date("2026-10-17T08:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

const item = (over: Partial<{ title: string; link: string; publishedAt: string; snippet: string }> = {}) => ({
  title: "Pakistan beat England - Dawn",
  link: "https://example.com/a",
  source: "Dawn",
  publishedAt: hoursAgo(2),
  snippet: "A great win.",
  imageUrl: null,
  ...over,
});

describe("cleanTitle", () => {
  it("strips the trailing publisher name", () => {
    expect(cleanTitle("Pakistan beat England - Dawn", "Dawn")).toBe("Pakistan beat England");
  });
});

describe("planFeeds", () => {
  it("creates one search per topic and keyword, plus user sources", () => {
    const plan = planFeeds({
      topics: [{ name: "Formula 1", weight: 1 }],
      keywords: ["Nvidia"],
      sources: [{ type: "site", url: "https://www.dawn.com" }],
    });
    expect(plan.map((p) => p.topic)).toEqual(["Formula 1", "Nvidia", "Your sources"]);
    expect(plan[2].url).toContain(encodeURIComponent("site:dawn.com"));
  });
});

describe("selectArticles", () => {
  const run = (items: ReturnType<typeof item>[], blockedKeywords: string[] = []) =>
    selectArticles([{ topic: "Cricket", items }], { blockedKeywords, now });

  it("keeps a fresh article and cleans its title", () => {
    const [a] = run([item()]);
    expect(a.title).toBe("Pakistan beat England");
    expect(a.id).toHaveLength(12);
  });

  it("drops articles older than 36 hours", () => {
    expect(run([item({ publishedAt: hoursAgo(40) })])).toHaveLength(0);
  });

  it("drops blocked keywords", () => {
    expect(run([item({ snippet: "Celebrity gossip inside" })], ["celebrity"])).toHaveLength(0);
  });

  it("removes duplicates by title", () => {
    expect(run([item(), item({ link: "https://other.com/b" })])).toHaveLength(1);
  });
});