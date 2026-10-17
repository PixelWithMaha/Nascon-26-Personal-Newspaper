import "server-only";
import type { Edition } from "@/features/edition/schemas";
import { EMPTY_PROFILE } from "@/features/interests/schemas";
import { HttpError } from "@/server/http";
import { getPreferences } from "./preferences";
import { ingest, type DateWindow } from "./ingest";
import { curate } from "./curate";
import { refreshLearnedProfile } from "./learning";
import { completeEdition, failEdition, getRecentStoryUrls, startEdition } from "./editions";
import { enrichArticles } from "./enrich";

export function localDate(timezone: string, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

export const shiftDate = (date: string, days: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Articles published on that day (with half a day of slack before it). */
function windowFor(date: string): DateWindow {
  return {
    from: new Date(Date.parse(`${date}T00:00:00Z`) - 12 * 3_600_000),
    to: new Date(Date.parse(`${date}T23:59:59Z`)),
  };
}

export async function generateEditionRecord(
  userId: string,
  options: { date?: string } = {},
): Promise<{ id: string; edition: Edition }> { const prefs = await getPreferences(userId);
  if (!prefs) throw new HttpError(409, "Finish onboarding first");

  const editionDate = options.date ?? localDate(prefs.timezone);
  const window = options.date ? windowFor(options.date) : undefined;
  const editionId = await startEdition(userId, editionDate);

  try {
    const t0 = Date.now();
    const [{ articles }, profile, recentUrls] = await Promise.all([
      ingest(prefs, window),
      refreshLearnedProfile(userId).catch((err) => {
        console.warn("[generate] profile refresh skipped", err);
        return EMPTY_PROFILE;
      }),
      getRecentStoryUrls(userId, editionDate),
    ]);
    console.info(`[generate] ${editionDate}: ingest+profile ${Date.now() - t0}ms, ${articles.length} articles`);

    const fresh = articles.filter((a) => !recentUrls.has(a.url));
    if (fresh.length < 3) {
      throw new HttpError(502, "Not enough fresh articles for that day. Try adding a few more topics.");
    }

       const t1 = Date.now();
    const enriched = await enrichArticles(fresh);
    console.info(
      `[generate] ${editionDate}: enrich ${Date.now() - t1}ms, ${enriched.filter((a) => a.imageUrl).length} with photos`,
    );

    const t2 = Date.now();
    const edition = await curate(enriched, prefs, editionDate, profile);
    console.info(`[generate] ${editionDate}: curate ${Date.now() - t2}ms`);
    await completeEdition(editionId, edition);
    return { id: editionId, edition };
  } catch (err) {
    await failEdition(editionId);
    throw err;
  }
}

export async function generateEdition(userId: string, options: { date?: string } = {}): Promise<Edition> {
  return (await generateEditionRecord(userId, options)).edition;
}