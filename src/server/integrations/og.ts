import "server-only";

export type Preview = { imageUrl: string | null; description: string | null };

const EMPTY: Preview = { imageUrl: null, description: null };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

function meta(head: string, keys: string[]): string | null {
  for (const key of keys) {
    const a = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
    const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, "i");
    const match = head.match(a) ?? head.match(b);
    if (match?.[1]) return decode(match[1].trim());
  }
  return null;
}

/** Reads the og:image and description an article publishes for link previews. */
export async function fetchPreview(url: string, timeoutMs = 3000): Promise<Preview> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MorningPaperBot/1.0)", Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return EMPTY;

  const head = (await res.text()).split(/<\/head>/i)[0].slice(0, 200_000);
  let imageUrl = meta(head, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]);
  if (imageUrl) {
    try {
      imageUrl = new URL(imageUrl, res.url).toString();
    } catch {
      imageUrl = null;
    }
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) imageUrl = null;

  return { imageUrl, description: meta(head, ["og:description", "description", "twitter:description"]) };
}