import "server-only";
import type { Edition, Story } from "@/features/edition/schemas";
import { findWikiImage } from "@/server/integrations/wikimedia";

const CONCURRENCY = 8;

/** Fills stories that have no article photo with a Wikimedia image of their main subject. */
export async function illustrate(edition: Edition, queries: Map<string, string>): Promise<Edition> {
  const stories = edition.sections.flatMap((s) => s.stories);
  const missing = stories.filter((s) => !s.imageUrl && queries.get(s.articleId));
  const found = new Map<string, { url: string; title: string } | null>();
  const used = new Set(stories.map((s) => s.imageUrl).filter(Boolean));

  const uniqueQueries = [...new Set(missing.map((s) => queries.get(s.articleId)!.trim().toLowerCase()))];
  let next = 0;
  async function worker() {
    while (next < uniqueQueries.length) {
      const q = uniqueQueries[next++];
      found.set(q, await findWikiImage(q).catch(() => null));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const withImage = (story: Story): Story => {
    if (story.imageUrl) return { ...story, imageCredit: story.imageCredit ?? `Photo: ${story.sourceName}` };
    const q = queries.get(story.articleId)?.trim().toLowerCase();
    const image = q ? found.get(q) : null;
    if (!image || used.has(image.url)) return story; // never print the same photo twice
    used.add(image.url);
    return { ...story, imageUrl: image.url, imageCredit: `Image: Wikimedia Commons · ${image.title}` };
  };

  return { ...edition, sections: edition.sections.map((s) => ({ ...s, stories: s.stories.map(withImage) })) };
}