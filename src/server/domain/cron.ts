import "server-only";
import { getSupabaseAdmin, runAsSystem } from "@/server/integrations/supabase";
import { generateEditionRecord, localDate } from "./generate";
import { getEditionPdf } from "./pdf";

const CONCURRENCY = 3; // readers printed in parallel
const TIME_BUDGET_MS = 240_000; // stop starting new work after 4 minutes (function limit is 5)
const MAX_READERS = 50; // most recently active readers per run

export type Reader = { userId: string; timezone: string };

/** Pure: readers who don't yet have a ready edition for today in their own timezone. */
export function readersToPrint(readers: Reader[], printed: Set<string>, now = new Date()) {
  return readers
    .map((r) => ({ ...r, date: localDate(r.timezone, now) }))
    .filter((r) => !printed.has(`${r.userId}:${r.date}`));
}

export type DailyRunSummary = {
  readers: number;
  skipped: number;
  printed: number;
  failed: { userId: string; error: string }[];
  deferred: number;
  durationMs: number;
};

export async function runDailyEditions(now = new Date()): Promise<DailyRunSummary> {
  const started = Date.now();
  const admin = getSupabaseAdmin();

  const { data: prefRows, error } = await admin
    .from("preferences")
    .select("user_id, timezone")
    .order("updated_at", { ascending: false })
    .limit(MAX_READERS);
  if (error) throw new Error(`Loading readers failed: ${error.message}`);

  const readers: Reader[] = ((prefRows ?? []) as { user_id: string; timezone: string }[]).map((r) => ({
    userId: r.user_id,
    timezone: r.timezone,
  }));
  if (readers.length === 0) {
    return { readers: 0, skipped: 0, printed: 0, failed: [], deferred: 0, durationMs: Date.now() - started };
  }

  // Editions already printed in the last two days (covers every timezone's "today").
  const since = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
  const { data: editionRows, error: edError } = await admin
    .from("editions")
    .select("user_id, edition_date")
    .eq("status", "ready")
    .in(
      "user_id",
      readers.map((r) => r.userId),
    )
    .gte("edition_date", since);
  if (edError) throw new Error(`Loading editions failed: ${edError.message}`);

  const printedSet = new Set(
    ((editionRows ?? []) as { user_id: string; edition_date: string }[]).map((r) => `${r.user_id}:${r.edition_date}`),
  );
  const queue = readersToPrint(readers, printedSet, now);

  const printed: string[] = [];
  const failed: { userId: string; error: string }[] = [];
  let next = 0;

  async function worker() {
    while (next < queue.length && Date.now() - started < TIME_BUDGET_MS) {
      const reader = queue[next++];
      try {
        await runAsSystem(async () => {
          const { id } = await generateEditionRecord(reader.userId);
          // A fresh PDF every day. If it fails, the edition still counts; it renders on first download.
          await getEditionPdf(id).catch((err) => console.warn("[cron] pdf skipped", reader.userId, err));
        });
        printed.push(reader.userId);
      } catch (err) {
        failed.push({ userId: reader.userId, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const summary: DailyRunSummary = {
    readers: readers.length,
    skipped: readers.length - queue.length,
    printed: printed.length,
    failed,
    deferred: queue.length - printed.length - failed.length,
    durationMs: Date.now() - started,
  };
  console.info("[cron] daily run", summary);
  return summary;
}