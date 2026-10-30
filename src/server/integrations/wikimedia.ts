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
    if (thumb && !isLogo(thumb.source) && thumb.width >= 300) {
      return { url: thumb.source, title: page.title };
    }
  }
  return null;
}

// Company and product articles often lead with a logo or wordmark: skip those (SVG or named "logo").
const isLogo = (url: string) => /\.svg|logo|wordmark|icon/i.test(url);

type CommonsPage = {
  index?: number;
  title: string;
  imageinfo?: { thumburl?: string; thumbwidth?: number; thumbheight?: number; mime?: string }[];
};

/** Fallback when Wikipedia only has a logo: searches Wikimedia Commons for a real photo of the subject. */
export async function findCommonsImage(query: string): Promise<{ url: string; title: string } | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: "8",
    gsrnamespace: "6",
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "900",
    origin: "*",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "TheMorningPaper/1.0 (hackathon project)" },
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl || info.mime !== "image/jpeg" || isLogo(page.title)) continue;
    // Photos only, wide enough for a front page and roughly landscape.
    if ((info.thumbwidth ?? 0) >= 600 && (info.thumbheight ?? 0) <= (info.thumbwidth ?? 0) * 1.1) {
      const title = page.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/_/g, " ");
      return { url: info.thumburl, title };
    }
  }
  return null;
}