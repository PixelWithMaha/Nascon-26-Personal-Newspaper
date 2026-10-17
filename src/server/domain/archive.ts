import "server-only";
import { editionSchema, type Edition } from "@/features/edition/schemas";
import type { EditionSummary } from "@/features/archive/schemas";
import { getSupabaseUser } from "@/server/integrations/supabase";

export function toSummary(id: string, editionDate: string, edition: Edition, hasPdf: boolean): EditionSummary {
  const stories = edition.sections.flatMap((s) => s.stories);
  const lead = stories.find((s) => s.id === edition.leadStoryId) ?? stories[0];

  return {
    id,
    editionDate,
    readerName: edition.masthead.readerName,
    tagline: edition.masthead.tagline,
    leadTopic: lead.topic,
    leadHeadline: lead.headline,
    leadDek: lead.dek,
    sections: edition.sections
      .flatMap((s) => {
        const first = s.stories.find((st) => st.id !== lead.id);
        return first ? [{ name: s.name, headline: first.headline }] : [];
      })
      .slice(0, 4),
    storyCount: stories.length,
    hasPdf,
  };
}

export async function listEditionSummaries(userId: string): Promise<EditionSummary[]> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase
    .from("editions")
    .select("id, edition_date, payload, pdf_path")
    .eq("user_id", userId)
    .eq("status", "ready")
    .order("edition_date", { ascending: false })
    .limit(60);
  if (error) throw new Error(`Loading archive failed: ${error.message}`);

   return (
    (data ?? []) as { id: string; edition_date: string; payload: unknown; pdf_path: string | null }[]
  ).flatMap((row) => {
    const parsed = editionSchema.safeParse(row.payload);
    return parsed.success ? [toSummary(row.id, row.edition_date, parsed.data, Boolean(row.pdf_path))] : [];
  });
}