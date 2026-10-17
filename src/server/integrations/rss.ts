import "server-only";
import Parser from "rss-parser";

type CustomItem = { source?: string | { _?: string } };

const parser: Parser<object, CustomItem> = new Parser({
  timeout: 8000,
  headers: { "User-Agent": "MorningPaperBot/1.0" },
  customFields: { item: ["source"] },
});

export type FeedItem = {
  title: string;
  link: string;
  source: string | null;
  publishedAt: string | null;
  snippet: string;
  imageUrl: string | null;
};

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(url);
  return feed.items.flatMap((item) => {
    if (!item.title || !item.link) return [];
    const source =
      typeof item.source === "string" ? item.source : (item.source?._ ?? feed.title ?? null);
    return [
      {
        title: item.title.trim(),
        link: item.link,
        source: source?.trim() || null,
        publishedAt: item.isoDate ?? null,
        snippet: (item.contentSnippet ?? "").replace(/\s+/g, " ").trim().slice(0, 400),
        imageUrl: item.enclosure?.url ?? null,
      },
    ];
  });
}