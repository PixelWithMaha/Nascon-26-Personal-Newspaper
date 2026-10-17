import "server-only";
import { createHash } from "node:crypto";
import type { Preferences } from "@/features/onboarding/schemas";
import { fetchFeed, type FeedItem } from "@/server/integrations/rss";

const MAX_AGE_HOURS = 36;
const MAX_PER_TOPIC = 12;
const MAX_TOTAL = 150;

// Optional extras per topic. A dead feed is skipped, never fatal.
const CURATED_FEEDS: Record<string, string[]> = {
  World: ["https://feeds.bbci.co.uk/news/world/rss.xml"],
  Pakistan: ["https://www.dawn.com/feeds/home"],
  Business: ["https://feeds.bbci.co.uk/news/business/rss.xml"],
  Technology: ["https://feeds.bbci.co.uk/news/technology/rss.xml"],
  Science: ["https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],
  Health: ["https://feeds.bbci.co.uk/news/health/rss.xml"],
  Cricket: ["https://feeds.bbci.co.uk/sport/cricket/rss.xml"],
  Football: ["https://feeds.bbci.co.uk/sport/football/rss.xml"],
  Entertainment: ["https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"],
};

export type Article = {
  id: string;
  title: string;
  url: string;
  source: string;
  topic: string;
  publishedAt: string;
  snippet: string;
  imageUrl: string | null;
};

type FeedRequest = { url: string; topic: string };
type FeedBatch = { topic: string; items: FeedItem[] };

export function googleNewsUrl(query: string): string {
  const q = encodeURIComponent(`${query} when:1d`);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function cleanSource(source: string | null, link: string): string {
  if (source && !/^https?:\/\//i.test(source)) return source;
  return (source && hostname(source)) ?? hostname(link) ?? "Unknown source";
}

export function planFeeds(prefs: Pick<Preferences, "topics" | "keywords" | "sources">): FeedRequest[] {
  const requests: FeedRequest[] = [];
  for (const topic of prefs.topics) {
    requests.push({ url: googleNewsUrl(topic.name), topic: topic.name });
    for (const url of CURATED_FEEDS[topic.name] ?? []) requests.push({ url, topic: topic.name });
  }
  for (const keyword of prefs.keywords) {
    requests.push({ url: googleNewsUrl(`"${keyword}"`), topic: keyword });
  }
  for (const source of prefs.sources) {
    const host = hostname(source.url);
    if (source.type === "rss") requests.push({ url: source.url, topic: "Your sources" });
    else if (host) requests.push({ url: googleNewsUrl(`site:${host}`), topic: "Your sources" });
  }
  const seen = new Set<string>();
  return requests.filter((r) => !seen.has(r.url) && seen.add(r.url));
}

export function cleanTitle(title: string, source: string | null): string {
  const suffix = source ? ` - ${source}` : "";
  return suffix && title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

export function articleId(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

const normalize = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

export function selectArticles(
  batches: FeedBatch[],
  { blockedKeywords, now = new Date() }: { blockedKeywords: string[]; now?: Date },
): Article[] {
  const cutoff = now.getTime() - MAX_AGE_HOURS * 3_600_000;
  const latest = now.getTime() + 3_600_000; // tolerate small clock skew
  const blocked = blockedKeywords.map((k) => k.toLowerCase());
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const perTopic = new Map<string, number>();
  const out: Article[] = [];

  for (const { topic, items } of batches) {
    for (const item of items) {
      const ts = item.publishedAt ? Date.parse(item.publishedAt) : NaN;
      if (Number.isNaN(ts) || ts < cutoff || ts > latest) continue;

      const title = cleanTitle(item.title, item.source);
      const text = `${title} ${item.snippet}`.toLowerCase();
      if (blocked.some((word) => text.includes(word))) continue;

      const titleKey = normalize(title);
      if (seenUrls.has(item.link) || seenTitles.has(titleKey)) continue;

      const count = perTopic.get(topic) ?? 0;
      if (count >= MAX_PER_TOPIC) continue;

      seenUrls.add(item.link);
      seenTitles.add(titleKey);
      perTopic.set(topic, count + 1);
      out.push({
        id: articleId(item.link),
        title,
        url: item.link,
                source: cleanSource(item.source, item.link),
        topic,
        publishedAt: new Date(ts).toISOString(),
        snippet: item.snippet,
        imageUrl: item.imageUrl,
      });
    }
  }

  return out.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, MAX_TOTAL);
}

export type IngestResult = {
  articles: Article[];
  feedsTried: number;
  feedsFailed: string[];
};

export async function ingest(prefs: Preferences): Promise<IngestResult> {
  const plan = planFeeds(prefs);
  const results = await Promise.allSettled(
    plan.map(async (req) => ({ topic: req.topic, items: await fetchFeed(req.url) })),
  );

  const batches: FeedBatch[] = [];
  const feedsFailed: string[] = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") batches.push(result.value);
    else feedsFailed.push(plan[i].url);
  });
  if (feedsFailed.length) console.warn(`[ingest] ${feedsFailed.length} feeds failed`, feedsFailed);

  return {
    articles: selectArticles(batches, { blockedKeywords: prefs.blockedKeywords }),
    feedsTried: plan.length,
    feedsFailed,
  };
}