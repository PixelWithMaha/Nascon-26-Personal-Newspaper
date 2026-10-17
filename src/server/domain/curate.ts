import "server-only";
import { z } from "zod";
import type { Preferences } from "@/features/onboarding/schemas";
import { editionSchema, storySizeSchema, type Edition, type Story } from "@/features/edition/schemas";
import { generateJson } from "@/server/integrations/gemini";
import type { Article } from "./ingest";

/** What Gemini is allowed to return. No URLs, sources or dates: those come from our data. */
export const modelEditionSchema = z.object({
  tagline: z.string(),
  editor_note: z.string(),
  sections: z.array(
    z.object({
      name: z.string(),
      stories: z.array(
        z.object({
          article_id: z.string(),
          headline: z.string(),
          dek: z.string(),
          summary: z.string(),
          why: z.string(),
          topic: z.string(),
          size: storySizeSchema,
        }),
      ),
    }),
  ),
});
export type ModelEdition = z.infer<typeof modelEditionSchema>;

const modelEditionJsonSchema = z.toJSONSchema(modelEditionSchema) as Record<string, unknown>;
delete modelEditionJsonSchema.$schema;

const SYSTEM_PROMPT = `You are the editor of "The Morning Paper", a personal daily newspaper written for one reader.

Rules:
- Pick up to TARGET_STORY_COUNT stories from ARTICLES. Use only article_id values that appear in ARTICLES. Never invent an id.
- Relevance first: drop articles that merely contain a topic word but are not really about what the reader means (for example a gambling law under "Gaming" when the reader means video games, or high school sports under "Gaming").
- Give more stories to higher-weight topics. Prefer stories that mention the reader's keywords. Never include anything matching blocked keywords.
- Avoid near-duplicate stories about the same event; keep the best one.
- Write headline, dek and summary ONLY from the given title and snippet. Do not add facts, numbers, names, dates or quotes that are not in them. If the snippet is thin, keep the summary short rather than guessing.
- headline: punchy newspaper style, under 12 words. dek: one line that adds context, under 20 words.
- summary: 40-100 words for lead and feature, 30-70 for standard, 1-2 sentences for brief.
- why: one short sentence to the reader explaining the pick, e.g. "Because AI is one of your top interests."
- Exactly one story has size "lead": the most important story for this reader today. Use "feature" for 1-3 strong stories, "brief" for minor items, "standard" otherwise.
- Group stories into 3-6 sections with short newspaper-style names. Order sections by importance to the reader; the lead's section comes first.
- topic: the reader topic the story belongs to, using the reader's own topic names where possible.
- tagline: a short, witty line for today's masthead. editor_note: 2-3 sentences previewing today's paper, addressed to the reader by name.
- READER.learned_profile summarises what this reader has recently liked and disliked. Follow it closely.
- Leave room for discovery: about 1 in 10 stories may come from a lower-weight topic if it is genuinely interesting.`;

/** 5 min -> 6, 10 -> 10, 15 -> 14, 20 -> 18 */
export function targetStoryCount(readingMinutes: number): number {
  return Math.max(4, Math.min(20, Math.round(readingMinutes * 0.8 + 2)));
}

export function buildPrompt(
  articles: Article[],
  prefs: Preferences,
  storyCount: number,
  learnedSummary = "",
): string {
  const reader = {
    name: prefs.displayName,
    topics: prefs.topics.map((t) => ({ name: t.name, weight: t.weight })),
    keywords: prefs.keywords,
    blocked_keywords: prefs.blockedKeywords,
    learned_profile: learnedSummary || "No feedback yet.",
  };

  const list = articles.map((a) => ({
    article_id: a.id,
    topic_hint: a.topic,
    title: a.title,
    source: a.source,
    published_at: a.publishedAt,
    snippet: a.snippet,
  }));
  return `TARGET_STORY_COUNT: ${storyCount}\n\nREADER:\n${JSON.stringify(reader)}\n\nARTICLES:\n${JSON.stringify(list)}`;
}

type AssembleContext = { editionDate: string; readerName: string; maxStories: number };

/** Joins model output back to our real articles. Unknown or repeated ids are dropped. */
export function assembleEdition(output: ModelEdition, articles: Article[], ctx: AssembleContext): Edition {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const used = new Set<string>();
  let count = 0;

  const sections = output.sections
    .map((section) => ({
      name: section.name.trim(),
      stories: section.stories.flatMap((s): Story[] => {
        const article = byId.get(s.article_id);
        if (!article || used.has(article.id) || count >= ctx.maxStories) return [];
        used.add(article.id);
        count += 1;
        return [
          {
            id: `s${count}`,
            articleId: article.id,
            headline: s.headline.trim() || article.title,
            dek: s.dek.trim(),
            summary: s.summary.trim() || article.snippet || article.title,
            why: s.why.trim(),
            topic: s.topic.trim() || article.topic,
            size: s.size,
            sourceName: article.source,
            url: article.url,
            publishedAt: article.publishedAt,
            imageUrl: article.imageUrl,
          },
        ];
      }),
    }))
    .filter((section) => section.name && section.stories.length > 0);

  const stories = sections.flatMap((s) => s.stories);
  if (stories.length === 0) throw new Error("Curation returned no usable stories");

  const lead = stories.find((s) => s.size === "lead") ?? stories[0];
  for (const story of stories) {
    if (story !== lead && story.size === "lead") story.size = "feature";
  }
  lead.size = "lead";

  return editionSchema.parse({
    editionDate: ctx.editionDate,
    masthead: {
      title: "The Morning Paper",
      tagline: output.tagline.trim(),
      readerName: ctx.readerName,
    },
    editorNote: output.editor_note.trim(),
    leadStoryId: lead.id,
    sections,
  });
}

export async function curate(
  articles: Article[],
  prefs: Preferences,
  editionDate: string,
  learnedSummary = "",
): Promise<Edition> {
  const maxStories = Math.min(targetStoryCount(prefs.readingMinutes), articles.length);
  const prompt = buildPrompt(articles, prefs, maxStories, learnedSummary);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await generateJson({ system: SYSTEM_PROMPT, prompt, jsonSchema: modelEditionJsonSchema });
      const output = modelEditionSchema.parse(raw);
      return assembleEdition(output, articles, {
        editionDate,
        readerName: prefs.displayName,
        maxStories,
      });
    } catch (err) {
      if (attempt === 2) throw err;
      console.warn("[curate] attempt 1 failed, retrying", err);
    }
  }
  throw new Error("Curation failed");
}