"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GenerateButton } from "@/features/edition";
import {
  DEFAULT_WEIGHT,
  INTEREST_LEVELS,
  READING_OPTIONS,
  TOPICS,
  TagInput,
  preferencesSchema,
  sourceSchema,
  useSavePreferences,
  type Preferences,
} from "@/features/onboarding";
import { useLearnedAction } from "../hooks";
import type { InterestsData, LearnedAction, LearnedItem, LearnedProfile, SignalRow } from "../schemas";

const MIN_TOPICS = 3;
const MAX_TOPICS = 12;

const VERBS: Record<SignalRow["signal"], string> = {
  like: "You liked",
  less_like_this: "You asked for less of",
  dislike: "You disliked",
  skip: "You skipped",
  click: "You opened",
  read: "You read",
};

const levelIndex = (weight: number) => (weight < 0.55 ? 0 : weight < 0.85 ? 1 : 2);

const chip = (active: boolean) =>
  cn(
    "border px-3 py-1 font-condensed text-xs uppercase tracking-[0.15em] transition-colors",
    active ? "border-ink bg-ink text-paper" : "border-ink/30 hover:border-ink",
  );

function Label({ children }: { children: ReactNode }) {
  return (
    <h2 className="border-b-2 border-ink pb-1 font-condensed text-xs uppercase tracking-[0.25em]">{children}</h2>
  );
}

type Kind = "likes" | "dislikes" | "exploring";

const COLUMNS: { kind: Kind; title: string; empty: string }[] = [
  { kind: "likes", title: "You're into", empty: "Like a few stories and we'll learn what you enjoy." },
  { kind: "dislikes", title: "You'd rather skip", empty: "Nothing you've pushed away yet." },
  { kind: "exploring", title: "Still figuring out", empty: "No mixed signals right now." },
];

function LearnedCard({
  item,
  kind,
  pending,
  onAction,
}: {
  item: LearnedItem;
  kind: Kind;
  pending: boolean;
  onAction: (action: LearnedAction["action"]) => void;
}) {
  const actions: { action: LearnedAction["action"]; label: string }[] =
    kind === "dislikes"
      ? [
          { action: "block", label: "Never show me this" },
          { action: "dismiss", label: "Actually I like it" },
        ]
      : [
          { action: "follow", label: "Yes, follow this" },
          { action: "dismiss", label: "Not really" },
        ];

  return (
    <li className="border-b border-ink/20 py-4 last:border-0">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="font-display text-lg font-bold leading-snug">{item.label}</h3>
        {item.isNew && (
          <span className="bg-ink px-1.5 py-0.5 font-condensed text-[9px] uppercase tracking-[0.2em] text-paper">
            New
          </span>
        )}
      </div>
      {item.reason && <p className="mt-1 font-serif text-sm italic text-ink/80">{item.reason}</p>}
      {item.evidence.length > 0 && (
        <p className="mt-1 font-serif text-xs text-ink/60">
          From {item.evidence.map((h) => `“${h}”`).join(" · ")}
        </p>
      )}
      {item.confirmed ? (
        <p className="mt-2 font-condensed text-[10px] uppercase tracking-[0.2em]">
          {kind === "dislikes" ? "✓ Kept out of your paper" : "✓ Following"}
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {actions.map((a) => (
            <button
              key={a.action}
              type="button"
              disabled={pending}
              onClick={() => onAction(a.action)}
              className="border border-ink/30 px-2 py-0.5 font-condensed text-[10px] uppercase tracking-[0.2em] text-ink/80 transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export function InterestsView({ initial }: { initial: InterestsData }) {
  const save = useSavePreferences();
  const learned = useLearnedAction();
  const [prefs, setPrefs] = useState<Preferences>(initial.preferences);
  const [profile, setProfile] = useState<LearnedProfile>(initial.learnedProfile);
  const [newTopic, setNewTopic] = useState("");
  const [sourceDraft, setSourceDraft] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [order] = useState(() =>
    [...initial.preferences.topics].sort((a, b) => b.weight - a.weight).map((t) => t.name.toLowerCase()),
  );
  const topics = useMemo(() => {
    const rank = (name: string) => {
      const i = order.indexOf(name.toLowerCase());
      return i === -1 ? order.length : i;
    };
    return [...prefs.topics].sort((a, b) => rank(a.name) - rank(b.name));
  }, [prefs.topics, order]);

  function commit(next: Preferences) {
    setPrefs(next);
    const parsed = preferencesSchema.safeParse(next);
    if (parsed.success) save.mutate(parsed.data);
  }

  function act(itemId: string, action: LearnedAction["action"]) {
    learned.mutate(
      { itemId, action },
      {
        onSuccess: (data) => {
          setPrefs(data.preferences);
          setProfile(data.learnedProfile);
        },
      },
    );
  }

  function addTopic(raw: string) {
    const name = raw.trim().slice(0, 40);
    setNewTopic("");
    if (!name || prefs.topics.length >= MAX_TOPICS) return;
    if (prefs.topics.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    commit({ ...prefs, topics: [...prefs.topics, { name, weight: DEFAULT_WEIGHT }] });
  }

  function addSource() {
    const url = sourceDraft.trim();
    if (!url) return;
    const parsed = sourceSchema.safeParse({ type: /rss|feed|\.xml/i.test(url) ? "rss" : "site", url });
    if (!parsed.success) return setSourceError(parsed.error.issues[0]?.message ?? "Enter a valid URL");
    setSourceDraft("");
    setSourceError(null);
    if (prefs.sources.some((s) => s.url === parsed.data.url)) return;
    commit({ ...prefs, sources: [...prefs.sources, parsed.data] });
  }

  const suggestions = TOPICS.filter(
    (name) => !prefs.topics.some((t) => t.name.toLowerCase() === name.toLowerCase()),
  );
  const hasProfile = profile.likes.length + profile.dislikes.length + profile.exploring.length > 0;
  const error = save.error ?? learned.error;
  const status = save.isPending || learned.isPending ? "Saving…" : error ? error.message : save.isSuccess || learned.isSuccess ? "Saved ✓" : "Changes save automatically";

  return (
    <div className="mx-auto max-w-6xl bg-paper px-4 py-8 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] md:px-10 md:py-10">
      <header className="border-b-4 border-double border-ink pb-5 text-center">
        <p className="font-blackletter text-4xl md:text-5xl">The Morning Paper</p>
        <h1 className="mt-2 font-display text-3xl font-bold italic md:text-4xl">
          What we know about {prefs.displayName}
        </h1>
        <p
          aria-live="polite"
          className={cn(
            "mt-2 font-condensed text-[11px] uppercase tracking-[0.25em]",
            error ? "text-destructive" : "text-ink/60",
          )}
        >
          {status}
        </p>
      </header>

      <section className="mt-8">
        <Label>What we&apos;ve learned from your reading</Label>
        {!hasProfile ? (
          <p className="mt-4 font-serif italic text-ink/70">
            Nothing yet. Use <strong>More like this</strong>, <strong>Less like this</strong> and{" "}
            <strong>Skip</strong> on stories. We&apos;ll describe what we learn here, in plain words, and you can
            correct us.
          </p>
        ) : (
          <div className="mt-2 grid gap-8 md:grid-cols-3 md:divide-x md:divide-ink/30">
            {COLUMNS.map(({ kind, title, empty }) => (
              <div key={kind} className="md:px-6 md:first:pl-0 md:last:pr-0">
                <p className="pt-3 font-display text-xl font-bold italic">{title}</p>
                {profile[kind].length === 0 ? (
                  <p className="mt-2 font-serif text-sm italic text-ink/60">{empty}</p>
                ) : (
                  <ul>
                    {profile[kind].map((item) => (
                      <LearnedCard
                        key={item.id}
                        item={item}
                        kind={kind}
                        pending={learned.isPending}
                        onAction={(action) => act(item.id, action)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <Label>Your topics</Label>
          <ul className="divide-y divide-ink/20">
            {topics.map((topic) => {
              const trend = initial.topicTrend[topic.name.toLowerCase()];
              const current = levelIndex(topic.weight);
              return (
                <li key={topic.name} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <span className="font-display text-xl font-bold">{topic.name}</span>
                    {trend && (
                      <span className="ml-2 font-serif text-xs italic text-ink/60">
                        {trend === "rising" ? "rising lately" : "cooling lately"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {INTEREST_LEVELS.map((level, i) => (
                      <button
                        key={level.label}
                        type="button"
                        aria-pressed={current === i}
                        onClick={() =>
                          commit({
                            ...prefs,
                            topics: prefs.topics.map((t) =>
                              t.name === topic.name ? { ...t, weight: level.weight } : t,
                            ),
                          })
                        }
                        className={chip(current === i)}
                      >
                        {level.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      aria-label={`Remove ${topic.name}`}
                      disabled={prefs.topics.length <= MIN_TOPICS}
                      onClick={() => commit({ ...prefs, topics: prefs.topics.filter((t) => t.name !== topic.name) })}
                      className="ml-2 text-lg leading-none text-ink/50 hover:text-ink disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {prefs.topics.length < MAX_TOPICS && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  aria-label="Add a topic"
                  placeholder="Add a topic, e.g. Formula 1"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTopic(newTopic);
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addTopic(newTopic)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((name) => (
                  <button key={name} type="button" onClick={() => addTopic(name)} className={chip(false)}>
                    + {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-10 lg:col-span-5 lg:border-l lg:border-ink lg:pl-8">
          <section>
            <Label>Your recent reactions</Label>
            {initial.recentSignals.length === 0 ? (
              <p className="mt-3 font-serif text-sm italic text-ink/60">Your likes, skips and reads will appear here.</p>
            ) : (
              <ol className="divide-y divide-ink/20">
                {initial.recentSignals.map((s, i) => (
                  <li key={`${s.createdAt}-${i}`} className="py-2 font-serif text-sm">
                    {VERBS[s.signal]} <span className="italic">“{s.headline ?? `a ${s.topic} story`}”</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="space-y-3">
            <Label>Reading time</Label>
            <div className="flex flex-wrap gap-2">
              {READING_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  aria-pressed={prefs.readingMinutes === minutes}
                  onClick={() => commit({ ...prefs, readingMinutes: minutes })}
                  className={chip(prefs.readingMinutes === minutes)}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <Label>Fine-tuning</Label>
            <TagInput
              id="keywords"
              label="Always look out for"
              placeholder="e.g. Babar Azam, Nvidia"
              value={prefs.keywords}
              onChange={(keywords) => commit({ ...prefs, keywords })}
            />
            <TagInput
              id="blockedKeywords"
              label="Never show me"
              placeholder="e.g. celebrity gossip"
              value={prefs.blockedKeywords}
              onChange={(blockedKeywords) => commit({ ...prefs, blockedKeywords })}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Your sources</p>
              <div className="flex gap-2">
                <Input
                  aria-label="Add a source URL"
                  type="url"
                  placeholder="https://www.dawn.com/feeds/home"
                  value={sourceDraft}
                  onChange={(e) => setSourceDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSource();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addSource}>
                  Add
                </Button>
              </div>
              {sourceError && <p className="text-sm text-destructive">{sourceError}</p>}
              <ul className="space-y-1 text-sm">
                {prefs.sources.map((s) => (
                  <li key={s.url} className="flex items-center justify-between gap-2">
                    <span className="truncate">{s.url}</span>
                    <button
                      type="button"
                      className="text-ink/60 hover:text-ink"
                      onClick={() => commit({ ...prefs, sources: prefs.sources.filter((x) => x.url !== s.url) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </aside>
      </div>

      <footer className="mt-12 flex flex-col items-center gap-3 border-t-4 border-double border-ink pt-6">
        <p className="font-display text-lg italic">Happy with the mix? See it in print.</p>
        <GenerateButton label="Print a fresh edition" redirectTo="/paper" />
      </footer>
    </div>
  );
}