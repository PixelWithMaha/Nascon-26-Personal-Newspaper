import "server-only";
import { editionSchema, type Edition } from "@/features/edition/schemas";
import { db, getSupabaseAdmin } from "@/server/integrations/supabase";

export async function startEdition(userId: string, editionDate: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from("editions")
    .upsert(
      { user_id: userId, edition_date: editionDate, status: "generating" },
      { onConflict: "user_id,edition_date" },
    )
    .select("id")
    .single<{ id: string }>();
  if (error) throw new Error(`Starting edition failed: ${error.message}`);
  return data.id;
}

export async function completeEdition(editionId: string, edition: Edition): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("editions")
    .update({ status: "ready", payload: edition, pdf_path: null })
    .eq("id", editionId);
  if (error) throw new Error(`Saving edition failed: ${error.message}`);
}

export async function failEdition(editionId: string): Promise<void> {
  await getSupabaseAdmin().from("editions").update({ status: "failed" }).eq("id", editionId);
}

export async function getLatestEdition(userId: string): Promise<{ id: string; edition: Edition } | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("editions")
    .select("id, payload")
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("edition_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; payload: unknown }>();
  if (error) throw new Error(`Loading edition failed: ${error.message}`);
  if (!data) return null;

  const parsed = editionSchema.safeParse(data.payload);
  if (!parsed.success) {
    console.warn("[editions] stored edition failed validation", parsed.error.issues[0]);
    return null;
  }
  return { id: data.id, edition: parsed.data };
}

/** Stories the reader removed from this edition. */
export async function getHiddenStoryIds(editionId: string): Promise<string[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("feedback")
    .select("story_id")
    .eq("edition_id", editionId)
    .in("signal", ["skip", "dislike", "less_like_this"]);
  if (error) throw new Error(`Loading feedback failed: ${error.message}`);
  return [...new Set((data ?? []).map((r: { story_id: string }) => r.story_id))];
}

/** URLs printed in this reader's editions during the previous `days` days. */
export async function getRecentStoryUrls(userId: string, beforeDate: string, days = 3): Promise<Set<string>> {
  const since = new Date(Date.parse(`${beforeDate}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const supabase = await db();
  const { data, error } = await supabase
    .from("editions")
    .select("payload")
    .eq("user_id", userId)
    .eq("status", "ready")
    .gte("edition_date", since)
    .lt("edition_date", beforeDate);
  if (error) throw new Error(`Loading recent editions failed: ${error.message}`);

  const urls = new Set<string>();
  for (const row of (data ?? []) as { payload: unknown }[]) {
    const parsed = editionSchema.safeParse(row.payload);
    if (parsed.success) parsed.data.sections.forEach((s) => s.stories.forEach((st) => urls.add(st.url)));
  }
  return urls;
}

export type EditionRecord = {
  id: string;
  userId: string;
  edition: Edition;
  pdfPath: string | null;
};

/** One ready edition, only if it belongs to the signed-in reader (RLS). */
export async function getEditionRecord(editionId: string): Promise<EditionRecord | null> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("editions")
    .select("id, user_id, payload, pdf_path")
    .eq("id", editionId)
    .eq("status", "ready")
    .maybeSingle<{ id: string; user_id: string; payload: unknown; pdf_path: string | null }>();
  if (error) throw new Error(`Loading edition failed: ${error.message}`);
  if (!data) return null;

  const parsed = editionSchema.safeParse(data.payload);
  if (!parsed.success) return null;
  return { id: data.id, userId: data.user_id, edition: parsed.data, pdfPath: data.pdf_path };
}

export async function setPdfPath(editionId: string, path: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("editions").update({ pdf_path: path }).eq("id", editionId);
  if (error) throw new Error(`Saving PDF path failed: ${error.message}`);
}