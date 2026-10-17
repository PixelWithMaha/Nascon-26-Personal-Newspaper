import "server-only";

type WikiPage = { index?: number; title: string; thumbnail?: { source: string; width: number; height: number } };

/** Finds the lead photo of the best-matching Wikipedia article. Skips logos and diagrams (SVG). */
export async function findWikiImage(query: string): Promise<{ url: string; title: string } | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "3",
    gsrnamespace: "0",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "900",
    origin: "*",
  });
  const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "TheMorningPaper/1.0 (hackathon project)" },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const page of pages) {
    const thumb = page.thumbnail;
    if (thumb && !/\.svg/i.test(thumb.source) && thumb.width >= 300) {
      return { url: thumb.source, title: page.title };
    }
  }
  return null;
}