"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { preferencesSchema, sourceSchema, type Preferences } from "../schemas";
import { useSavePreferences } from "../hooks";
import { DEFAULT_WEIGHT, INTEREST_LEVELS, READING_OPTIONS, TOPICS } from "../constants";
import { TagInput } from "./TagInput";

const STEPS = [
  {
    title: "Good morning.",
    subtitle: "One paper, every morning, made for you. Whose name goes on the masthead?",
    fields: ["displayName"],
  },
  {
    title: "What should your paper cover?",
    subtitle: "Pick at least three. You can change these any time.",
    fields: ["topics"],
  },
  {
    title: "How much of each?",
    subtitle: "Topics you care about most get more space and the front page.",
    fields: ["topics"],
  },
  {
    title: "Make it yours",
    subtitle: "All optional. Skip straight to your paper if you like.",
    fields: ["readingMinutes", "keywords", "blockedKeywords", "sources"],
  },
] as const;

const chip = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-2 text-sm transition-colors",
    active ? "border-foreground bg-foreground text-background" : "hover:bg-muted",
  );
export function OnboardingFlow({ initialName = "" }: { initialName?: string }) {
  const router = useRouter();
  const save = useSavePreferences();
  const [step, setStep] = useState(0);
  const [customTopic, setCustomTopic] = useState("");
  const [sourceDraft, setSourceDraft] = useState("");
  const [sourceError, setSourceError] = useState<string | null>(null);

  const form = useForm<Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      displayName: initialName,
      topics: [],
      keywords: [],
      blockedKeywords: [],
      sources: [],
      readingMinutes: 10,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
  });

  const { errors } = form.formState;
  const topics = form.watch("topics");
  const keywords = form.watch("keywords");
  const blockedKeywords = form.watch("blockedKeywords");
  const sources = form.watch("sources");
  const readingMinutes = form.watch("readingMinutes");

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function setTopics(next: Preferences["topics"]) {
    form.setValue("topics", next, { shouldValidate: Boolean(errors.topics) });
  }

  function toggleTopic(name: string) {
    const picked = topics.some((t) => t.name.toLowerCase() === name.toLowerCase());
    setTopics(
      picked
        ? topics.filter((t) => t.name.toLowerCase() !== name.toLowerCase())
        : [...topics, { name, weight: DEFAULT_WEIGHT }],
    );
  }

  function addCustomTopic() {
    const name = customTopic.trim().slice(0, 40);
    setCustomTopic("");
    if (!name || topics.some((t) => t.name.toLowerCase() === name.toLowerCase())) return;
    setTopics([...topics, { name, weight: DEFAULT_WEIGHT }]);
  }

  function setWeight(name: string, weight: number) {
    setTopics(topics.map((t) => (t.name === name ? { ...t, weight } : t)));
  }

  function addSource() {
    const url = sourceDraft.trim();
    if (!url) return;
    const type = /rss|feed|\.xml/i.test(url) ? "rss" : "site";
    const parsed = sourceSchema.safeParse({ type, url });
    if (!parsed.success) {
      setSourceError(parsed.error.issues[0]?.message ?? "Enter a valid URL");
      return;
    }
    if (sources.some((s) => s.url === parsed.data.url)) return setSourceDraft("");
    form.setValue("sources", [...sources, parsed.data]);
    setSourceDraft("");
    setSourceError(null);
  }

  async function next() {
    const ok = await form.trigger([...current.fields]);
    if (ok) setStep((s) => s + 1);
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      router.push("/paper");
    } catch {
      // Message is shown from save.error below.
    }
  });

  const customTopics = topics.filter(
    (t) => !TOPICS.some((name) => name.toLowerCase() === t.name.toLowerCase()),
  );

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-10 border-b pb-4 text-center">
        <p className="font-serif text-2xl font-bold tracking-tight">The Morning Paper</p>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
      </header>

      <form
        noValidate
        onSubmit={(e) => {
          if (isLast) return submit(e);
          e.preventDefault();
          void next();
        }}
        className="space-y-8"
      >
        <div>
          <h1 className="font-serif text-4xl font-bold tracking-tight">{current.title}</h1>
          <p className="mt-2 text-muted-foreground">{current.subtitle}</p>
        </div>

        {step === 0 && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              autoFocus
              autoComplete="given-name"
              placeholder="e.g. Ayesha"
              {...form.register("displayName")}
            />
            {errors.displayName && (
              <p className="text-sm text-destructive">{errors.displayName.message}</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <ul className="flex flex-wrap gap-2">
              {[...TOPICS, ...customTopics.map((t) => t.name)].map((name) => {
                const active = topics.some((t) => t.name.toLowerCase() === name.toLowerCase());
                return (
                  <li key={name}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleTopic(name)}
                      className={chip(active)}
                    >
                      {name}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <Input
                aria-label="Add your own topic"
                placeholder="Add your own, e.g. Formula 1"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTopic();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addCustomTopic}>
                Add
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{topics.length} selected</p>
            {errors.topics && (
              <p className="text-sm text-destructive">
                {errors.topics.message ?? errors.topics.root?.message}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <ul className="divide-y rounded-lg border">
            {topics.map((topic) => (
              <li key={topic.name} className="flex items-center justify-between gap-4 p-4">
                <span className="font-medium">{topic.name}</span>
                <div role="radiogroup" aria-label={`How much ${topic.name}`} className="flex gap-1">
                  {INTEREST_LEVELS.map((level) => (
                    <button
                      key={level.label}
                      type="button"
                      role="radio"
                      aria-checked={topic.weight === level.weight}
                      onClick={() => setWeight(topic.name, level.weight)}
                      className={cn(chip(topic.weight === level.weight), "px-3 py-1 text-xs")}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div className="space-y-2">
              <Label>Reading time each morning</Label>
              <div className="flex gap-2">
                {READING_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    aria-pressed={readingMinutes === minutes}
                    onClick={() => form.setValue("readingMinutes", minutes)}
                    className={chip(readingMinutes === minutes)}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>

            <TagInput
              id="keywords"
              label="Always look out for"
              hint="People, companies or terms. Press Enter after each."
              placeholder="e.g. Babar Azam, Nvidia"
              value={keywords}
              onChange={(next) => form.setValue("keywords", next)}
            />

            <TagInput
              id="blockedKeywords"
              label="Never show me"
              placeholder="e.g. celebrity gossip"
              value={blockedKeywords}
              onChange={(next) => form.setValue("blockedKeywords", next)}
            />

            <div className="space-y-2">
              <Label htmlFor="source">Sources you already read</Label>
              <p className="text-sm text-muted-foreground">An RSS feed or a site URL.</p>
              <div className="flex gap-2">
                <Input
                  id="source"
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
              {sources.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {sources.map((s) => (
                    <li key={s.url} className="flex items-center justify-between gap-2">
                      <span className="truncate">{s.url}</span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          form.setValue("sources", sources.filter((x) => x.url !== s.url))
                        }
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {save.error && <p className="text-sm text-destructive">{save.error.message}</p>}

        <div className="flex items-center justify-between border-t pt-6">
          <Button
            type="button"
            variant="ghost"
            disabled={step === 0 || save.isPending}
            onClick={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
          <Button type="submit" size="lg" disabled={save.isPending}>
            {isLast ? (save.isPending ? "Setting your paper…" : "Create my paper") : "Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}