import "server-only";
import type { Edition } from "@/features/edition/schemas";
import { HttpError } from "@/server/http";
import { getPreferences } from "./preferences";
import { ingest } from "./ingest";
import { curate } from "./curate";
import { refreshLearnedSummary } from "./learning";
import { completeEdition, failEdition, getRecentStoryUrls, startEdition } from "./editions";


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

export async function generateEdition(userId: string): Promise<Edition> {
  const prefs = await getPreferences(userId);
  if (!prefs) throw new HttpError(409, "Finish onboarding first");

  const editionDate = localDate(prefs.timezone);
  const editionId = await startEdition(userId, editionDate);

    try {
    const [{ articles }, learnedSummary, recentUrls] = await Promise.all([
      ingest(prefs),
      refreshLearnedSummary(userId).catch((err) => {
        console.warn("[generate] learned summary skipped", err);
        return "";
      }),
      getRecentStoryUrls(userId, editionDate),
    ]);

    const fresh = articles.filter((a) => !recentUrls.has(a.url));
    if (fresh.length < 3) {
      throw new HttpError(502, "Not enough fresh articles today. Try adding a few more topics.");
    }

    const edition = await curate(fresh, prefs, editionDate, learnedSummary);
    await completeEdition(editionId, edition);
    return edition;
  } catch (err) {
    await failEdition(editionId);
    throw err;
  }
}