import "server-only";
import Parser from "rss-parser";

type MediaTag = { $?: { url?: string; medium?: string; type?: string } };
type CustomItem = {
  source?: string | { _?: string };
  mediaThumbnail?: MediaTag;
  mediaContent?: MediaTag[];
};

const parser = new Parser<object, CustomItem>({
  timeout: 8000,
  headers: { "User-Agent": "MorningPaperBot/1.0" },
  customFields: {
    item: ["source", ["media:thumbnail", "mediaThumbnail"], ["media:content", "mediaContent", { keepArray: true }]],
  },
} as unknown as Parser.ParserOptions<object, CustomItem>);

export type FeedItem = {
  title: string;
  link: string;
  source: string | null;
  publishedAt: string | null;
  snippet: string;
  imageUrl: string | null;
};

const isImage = (m: MediaTag) =>
  Boolean(m.$?.url) &&
  (m.$?.medium === "image" || /image/i.test(m.$?.type ?? "") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(m.$?.url ?? ""));

function imageOf(item: Parser.Item & CustomItem): string | null {
  const enclosure = item.enclosure?.url && /image/i.test(item.enclosure.type ?? "image") ? item.enclosure.url : null;
  const url = enclosure ?? item.mediaThumbnail?.$?.url ?? item.mediaContent?.find(isImage)?.$?.url ?? null;
  return url && /^https?:\/\//i.test(url) ? url : null;
}

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
        imageUrl: imageOf(item),
      },
    ];
  });
}