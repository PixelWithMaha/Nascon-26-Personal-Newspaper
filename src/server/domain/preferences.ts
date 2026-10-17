import "server-only";
import { getSupabaseUser } from "@/server/integrations/supabase";
import { preferencesSchema, type Preferences } from "@/features/onboarding/schemas";
import { EMPTY_PROFILE, learnedProfileSchema, type LearnedProfile } from "@/features/interests/schemas";

const COLUMNS =
  "display_name, topics, keywords, blocked_keywords, sources, reading_minutes, timezone";

type PreferencesRow = {
  display_name: string | null;
  topics: unknown;
  keywords: string[];
  blocked_keywords: string[];
  sources: unknown;
  reading_minutes: number;
  timezone: string;
};

function fromRow(row: PreferencesRow): Preferences {
  return preferencesSchema.parse({
    displayName: row.display_name ?? "",
    topics: row.topics,
    keywords: row.keywords,
    blockedKeywords: row.blocked_keywords,
    sources: row.sources,
    readingMinutes: row.reading_minutes,
    timezone: row.timezone,
  });
}

export async function getPreferences(userId: string): Promise<Preferences | null> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase
    .from("preferences")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<PreferencesRow>();
  if (error) throw new Error(`Loading preferences failed: ${error.message}`);
  return data ? fromRow(data) : null;
}

export async function hasPreferences(userId: string): Promise<boolean> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase
    .from("preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Checking preferences failed: ${error.message}`);
  return data !== null;
}

export async function savePreferences(userId: string, input: Preferences): Promise<Preferences> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase
    .from("preferences")
    .upsert(
      {
        user_id: userId,
        display_name: input.displayName,
        topics: input.topics,
        keywords: input.keywords,
        blocked_keywords: input.blockedKeywords,
        sources: input.sources,
        reading_minutes: input.readingMinutes,
        timezone: input.timezone,
      },
      { onConflict: "user_id" },
    )
    .select(COLUMNS)
    .single<PreferencesRow>();
  if (error) throw new Error(`Saving preferences failed: ${error.message}`);
  return fromRow(data);
}

export async function updateTopicWeights(userId: string, topics: Preferences["topics"]): Promise<void> {
  const supabase = await getSupabaseUser();
  const { error } = await supabase.from("preferences").update({ topics }).eq("user_id", userId);
  if (error) throw new Error(`Updating weights failed: ${error.message}`);
}


export async function getLearnedProfile(userId: string): Promise<LearnedProfile> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase
    .from("preferences")
    .select("learned_profile")
    .eq("user_id", userId)
    .maybeSingle<{ learned_profile: unknown }>();
  if (error) throw new Error(`Loading learned profile failed: ${error.message}`);
  const parsed = learnedProfileSchema.safeParse(data?.learned_profile);
  return parsed.success ? parsed.data : EMPTY_PROFILE;
}

export async function saveLearnedProfile(userId: string, profile: LearnedProfile): Promise<void> {
  const supabase = await getSupabaseUser();
  const { error } = await supabase
    .from("preferences")
    .update({ learned_profile: learnedProfileSchema.parse(profile) })
    .eq("user_id", userId);
  if (error) throw new Error(`Saving learned profile failed: ${error.message}`);
}