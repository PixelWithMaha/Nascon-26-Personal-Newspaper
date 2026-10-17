import "server-only";
import { z } from "zod";
import type { Preferences, Topic } from "@/features/onboarding/schemas";
import {
  editionSchema,
  feedbackSignalSchema,
  type FeedbackInput,
  type FeedbackSignal,
} from "@/features/edition/schemas";
import type {
  LearnedAction,
  LearnedItem,
  LearnedProfile,
  SignalRow,
  TopicTrend,
} from "@/features/interests/schemas";
import { getSupabaseUser } from "@/server/integrations/supabase";
import { generateJson } from "@/server/integrations/gemini";
import { HttpError } from "@/server/http";
import { getLearnedProfile, getPreferences, saveLearnedProfile, updateTopicWeights } from "./preferences";

/* ---------- Topic weights (internal, never shown) ---------- */

export const SIGNAL_DELTAS: Record<FeedbackSignal, number> = {
  like: 0.1,
  click: 0.05,
  read: 0.05,
  skip: -0.03,
  dislike: -0.1,
  less_like_this: -0.15,
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number) => round2(Math.min(1, Math.max(0.05, n)));

export function applySignal(topics: Topic[], topicName: string, signal: FeedbackSignal) {
  const key = topicName.trim().toLowerCase();
  const index = topics.findIndex((t) => t.name.toLowerCase() === key);
  if (index === -1) return { topics, weight: null };
  const weight = clamp(topics[index].weight + SIGNAL_DELTAS[signal]);
  return { topics: topics.map((t, i) => (i === index ? { ...t, weight } : t)), weight };
}

export function feedbackEffect(rows: { topic: string; signal: FeedbackSignal }[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const row of rows) {
    const key = row.topic.trim().toLowerCase();
    totals[key] = (totals[key] ?? 0) + SIGNAL_DELTAS[row.signal];
  }
  for (const key of Object.keys(totals)) totals[key] = round2(totals[key]);
  return totals;
}

/** Words, not numbers: which topics feedback is pushing up or down. */
export function topicTrend(effect: Record<string, number>): Record<string, TopicTrend> {
  const trend: Record<string, TopicTrend> = {};
  for (const [topic, value] of Object.entries(effect)) {
    if (value >= 0.1) trend[topic] = "rising";
    else if (value <= -0.1) trend[topic] = "cooling";
  }
  return trend;
}

/* ---------- Recording feedback ---------- */

export async function recordFeedback(userId: string, input: FeedbackInput) {
  const supabase = await getSupabaseUser();

  const { data: row, error } = await supabase
    .from("editions")
    .select("payload")
    .eq("id", input.editionId)
    .maybeSingle<{ payload: unknown }>();
  if (error) throw new Error(`Loading edition failed: ${error.message}`);
  if (!row) throw new HttpError(404, "Edition not found");

  const edition = editionSchema.parse(row.payload);
  const story = edition.sections.flatMap((s) => s.stories).find((s) => s.id === input.storyId);
  if (!story) throw new HttpError(404, "Story not found");

  const { count, error: countError } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", input.editionId)
    .eq("story_id", input.storyId)
    .eq("signal", input.signal);
  if (countError) throw new Error(`Checking feedback failed: ${countError.message}`);
  if ((count ?? 0) > 0) return { recorded: false, topic: story.topic, weight: null };

  const { error: insertError } = await supabase.from("feedback").insert({
    user_id: userId,
    edition_id: input.editionId,
    story_id: input.storyId,
    topic: story.topic,
    signal: input.signal,
    value: input.value ?? null,
  });
  if (insertError) throw new Error(`Saving feedback failed: ${insertError.message}`);

  const prefs = await getPreferences(userId);
  if (!prefs) return { recorded: true, topic: story.topic, weight: null };

  const { topics, weight } = applySignal(prefs.topics, story.topic, input.signal);
  if (weight !== null) await updateTopicWeights(userId, topics);
  return { recorded: true, topic: story.topic, weight };
}

type FeedbackDbRow = { created_at: string; edition_id: string; story_id: string; topic: string; signal: string };

export async function loadSignals(
  userId: string,
  { sinceDays = 14, limit = 200 }: { sinceDays?: number; limit?: number } = {},
): Promise<SignalRow[]> {
  const supabase = await getSupabaseUser();
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();

  const { data, error } = await supabase
    .from("feedback")
    .select("created_at, edition_id, story_id, topic, signal")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Loading feedback failed: ${error.message}`);
  const rows = (data ?? []) as FeedbackDbRow[];
  if (rows.length === 0) return [];

  const editionIds = [...new Set(rows.map((r) => r.edition_id))];
  const { data: editions, error: edError } = await supabase
    .from("editions")
    .select("id, payload")
    .in("id", editionIds);
  if (edError) throw new Error(`Loading editions failed: ${edError.message}`);

  const headlines = new Map<string, string>();
  for (const e of (editions ?? []) as { id: string; payload: unknown }[]) {
    const parsed = editionSchema.safeParse(e.payload);
    if (!parsed.success) continue;
    parsed.data.sections.forEach((s) =>
      s.stories.forEach((st) => headlines.set(`${e.id}:${st.id}`, st.headline)),
    );
  }

  return rows.flatMap((r) => {
    const signal = feedbackSignalSchema.safeParse(r.signal);
    if (!signal.success) return [];
    return [
      {
        createdAt: r.created_at,
        signal: signal.data,
        topic: r.topic,
        headline: headlines.get(`${r.edition_id}:${r.story_id}`) ?? null,
      },
    ];
  });
}

/* ---------- Learned profile (shown to the reader in plain English) ---------- */

const modelItemSchema = z.object({
  label: z.string(),
  keyword: z.string(),
  reason: z.string(),
  evidence_refs: z.array(z.string()),
});
const modelProfileSchema = z.object({
  likes: z.array(modelItemSchema),
  dislikes: z.array(modelItemSchema),
  exploring: z.array(modelItemSchema),
});
export type ModelProfile = z.infer<typeof modelProfileSchema>;

const modelProfileJsonSchema = z.toJSONSchema(modelProfileSchema) as Record<string, unknown>;
delete modelProfileJsonSchema.$schema;

const PROFILE_PROMPT = `You study how one newspaper reader reacted to stories and describe their taste in plain English.
Signals: like, click and read are positive. dislike and less_like_this are strongly negative. skip is mildly negative.

Return up to 5 items for each list:
- likes: specific themes they clearly enjoy
- dislikes: specific themes they want less of
- exploring: themes with mixed or thin signals

Each item:
- label: a specific theme in plain words, more specific than the topic name. Examples: "EV range and battery news", "BMW motorsport results".
- keyword: 1-3 words a news search could use for the theme, e.g. "EV range".
- reason: one short sentence to the reader in second person, e.g. "You liked three stories about how far new EVs can go."
- evidence_refs: the ref ids (r1, r2, ...) of the signals that support the item. Every item needs at least one.

Only infer from the signals given. Never include themes listed in ALREADY_DECIDED.`;

const allItems = (p: LearnedProfile) => [...p.likes, ...p.dislikes, ...p.exploring];

export const slugify = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";

/** Pure: turns model output into a profile, with evidence taken only from our own signals. */
export function buildProfile(
  output: ModelProfile,
  signals: SignalRow[],
  previous: LearnedProfile,
  now = new Date(),
): LearnedProfile {
  const headlineByRef = new Map(signals.map((s, i) => [`r${i + 1}`, s.headline]));
  const confirmed = allItems(previous).filter((i) => i.confirmed);
  const decided = new Set([...previous.dismissed, ...confirmed.map((i) => i.label)].map((l) => l.toLowerCase()));
  const previousLabels = new Set(allItems(previous).map((i) => i.label.toLowerCase()));
  const seen = new Set<string>();

  const convert = (items: ModelProfile["likes"]): LearnedItem[] =>
    items.flatMap((item) => {
      const label = item.label.trim().slice(0, 80);
      const key = label.toLowerCase();
      if (!label || decided.has(key) || seen.has(key)) return [];
      const evidence = [
        ...new Set(
          item.evidence_refs
            .map((ref) => headlineByRef.get(ref.trim()))
            .filter((h): h is string => Boolean(h)),
        ),
      ].slice(0, 3);
      if (evidence.length === 0) return [];
      seen.add(key);
      return [
        {
          id: slugify(label),
          label,
          keyword: (item.keyword.trim() || label).slice(0, 40),
          reason: item.reason.trim().slice(0, 200),
          evidence,
          confirmed: false,
          isNew: !previousLabels.has(key),
        },
      ];
    });

  const pinned = (list: LearnedItem[]) => list.filter((i) => i.confirmed).map((i) => ({ ...i, isNew: false }));

  return {
    likes: [...pinned(previous.likes), ...convert(output.likes)].slice(0, 6),
    dislikes: [...pinned(previous.dislikes), ...convert(output.dislikes)].slice(0, 6),
    exploring: convert(output.exploring).slice(0, 6),
    dismissed: previous.dismissed,
    updatedAt: now.toISOString(),
  };
}

export function isProfileStale(profile: LearnedProfile, latestSignalAt: string | undefined): boolean {
  if (!latestSignalAt) return false;
  if (!profile.updatedAt) return true;
  return Date.parse(latestSignalAt) > Date.parse(profile.updatedAt);
}

export async function refreshLearnedProfile(userId: string): Promise<LearnedProfile> {
  const [signals, previous] = await Promise.all([loadSignals(userId), getLearnedProfile(userId)]);
  if (signals.length === 0) return previous;

  const decided = [...previous.dismissed, ...allItems(previous).filter((i) => i.confirmed).map((i) => i.label)];
  const lines = signals.map(
    (s, i) => `r${i + 1} ${s.signal}: [${s.topic}] ${s.headline ?? "(headline unavailable)"}`,
  );
  const prompt = `ALREADY_DECIDED: ${JSON.stringify(decided)}\n\nSIGNALS (newest first):\n${lines.join("\n")}`;

  const raw = await generateJson({
    system: PROFILE_PROMPT,
    prompt,
    jsonSchema: modelProfileJsonSchema,
    temperature: 0.2,
  });
  const profile = buildProfile(modelProfileSchema.parse(raw), signals, previous);
  await saveLearnedProfile(userId, profile);
  return profile;
}

/* ---------- Reader corrections ---------- */

const hasTag = (tags: string[], tag: string) => tags.some((t) => t.toLowerCase() === tag.toLowerCase());
const addTag = (tags: string[], tag: string) => (hasTag(tags, tag) || tags.length >= 20 ? tags : [...tags, tag]);
const dropTag = (tags: string[], tag: string) => tags.filter((t) => t.toLowerCase() !== tag.toLowerCase());

const withoutItem = (p: LearnedProfile, id: string): LearnedProfile => ({
  ...p,
  likes: p.likes.filter((i) => i.id !== id),
  dislikes: p.dislikes.filter((i) => i.id !== id),
  exploring: p.exploring.filter((i) => i.id !== id),
});

/** Pure: applies "follow", "block" or "dismiss" to the profile and preferences. */
export function applyLearnedChoice(prefs: Preferences, profile: LearnedProfile, { itemId, action }: LearnedAction) {
  const isDislike = profile.dislikes.some((i) => i.id === itemId);
  const item = allItems(profile).find((i) => i.id === itemId);
  if (!item) throw new HttpError(404, "That item is no longer in your profile");

  const rest = withoutItem(profile, itemId);
  const pinned = { ...item, confirmed: true, isNew: false };

  if (action === "dismiss") {
    return {
      preferences: prefs,
      learnedProfile: { ...rest, dismissed: [...profile.dismissed, item.label].slice(-100) },
    };
  }
  if (action === "follow") {
    if (isDislike) throw new HttpError(400, "Can't follow a theme you want less of");
    return {
      preferences: {
        ...prefs,
        keywords: addTag(prefs.keywords, item.keyword),
        blockedKeywords: dropTag(prefs.blockedKeywords, item.keyword),
      },
      learnedProfile: { ...rest, likes: [pinned, ...rest.likes].slice(0, 6) },
    };
  }
  if (!isDislike) throw new HttpError(400, "Only themes you want less of can be blocked");
  return {
    preferences: {
      ...prefs,
      blockedKeywords: addTag(prefs.blockedKeywords, item.keyword),
      keywords: dropTag(prefs.keywords, item.keyword),
    },
    learnedProfile: { ...rest, dislikes: [pinned, ...rest.dislikes].slice(0, 6) },
  };
}