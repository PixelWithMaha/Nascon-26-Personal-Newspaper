import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { getPreferences } from "@/server/domain/preferences";
import { generateEdition, localDate, shiftDate } from "@/server/domain/generate";

export const maxDuration = 300;

const querySchema = z.object({ days: z.coerce.number().int().min(1).max(14).default(6) });

/** Dev-only: prints real editions for the past N days, oldest first. Disabled in production. */
export const POST = route(async (request: Request) => {
  if (process.env.NODE_ENV === "production") throw new HttpError(404, "Not found");

  const userId = await requireUserId();
  const { days } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const prefs = await getPreferences(userId);
  if (!prefs) throw new HttpError(409, "Finish onboarding first");

  const today = localDate(prefs.timezone);
  const results: { date: string; ok: boolean; lead?: string; error?: string }[] = [];

  for (let back = days; back >= 1; back--) {
    const date = shiftDate(today, -back);
    try {
      const edition = await generateEdition(userId, { date });
      const lead = edition.sections.flatMap((s) => s.stories).find((s) => s.id === edition.leadStoryId);
      results.push({ date, ok: true, lead: lead?.headline });
    } catch (err) {
      results.push({ date, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ results });
});