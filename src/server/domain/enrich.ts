import "server-only";
import { fetchPreview, type Preview } from "@/server/integrations/og";
import type { Article } from "./ingest";

const MAX_ARTICLES = 40;
const CONCURRENCY = 10;
const DEADLINE_MS = 6000; // never let enrichment slow printing by more than ~6s

// Google News links are redirect pages we can't follow server-side.
const isRedirectLink = (url: string) => /^https?:\/\/news\.google\.com\//i.test(url);

/** Adds the article's own preview image and a longer description where available. */
export async function enrichArticles(articles: Article[]): Promise<Article[]> {
  const started = Date.now();
  const targets = articles.filter((a) => !isRedirectLink(a.url)).slice(0, MAX_ARTICLES);
  const previews = new Map<string, Preview>();
  let next = 0;

  async function worker() {
    while (next < targets.length && Date.now() - started < DEADLINE_MS) {
      const article = targets[next++];
      try {
        previews.set(article.id, await fetchPreview(article.url));
      } catch {
        // Slow or blocked site: keep the article as it is.
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  return articles.map((a) => {
    const preview = previews.get(a.id);
    if (!preview) return a;
    const description = preview.description?.replace(/\s+/g, " ").trim() ?? "";
    return {
      ...a,
      imageUrl: a.imageUrl ?? preview.imageUrl,
      snippet: description.length > a.snippet.length ? description.slice(0, 400) : a.snippet,
    };
  });
}