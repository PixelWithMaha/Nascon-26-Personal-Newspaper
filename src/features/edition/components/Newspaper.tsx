import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Edition, Story } from "../schemas";
import { FeedbackProvider } from "./FeedbackProvider";
import { OriginalLink } from "./OriginalLink";
import { StoryShell } from "./StoryShell";

const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

const issueNumber = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000);
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Kicker({ children, inverse = false }: { children: ReactNode; inverse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block font-condensed text-[11px] font-semibold uppercase tracking-[0.25em]",
        inverse ? "bg-ink px-2 py-1 text-paper" : "border-b border-ink pb-0.5",
      )}
    >
      {children}
    </span>
  );
}

function Byline({ story }: { story: Story }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-condensed text-[11px] uppercase tracking-[0.2em] text-ink/70">
      <span>{story.sourceName}</span>
      <span aria-hidden>·</span>
      <OriginalLink
        storyId={story.id}
        href={story.url}
        className="text-ink underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        Read the original →
      </OriginalLink>
    </p>
  );
}

function Why({ story }: { story: Story }) {
  if (!story.why) return null;
  return (
    <p className="mt-2 border-l-2 border-ink/40 pl-2 font-serif text-xs italic text-ink/70">
      Why you&apos;re seeing this: {story.why}
    </p>
  );
}

function Photo({ story, className }: { story: Story; className?: string }) {
  if (!story.imageUrl) return null;
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={story.imageUrl}
        alt=""
        loading="lazy"
        className="max-h-[420px] w-full border border-ink/30 object-cover contrast-125 grayscale"
      />
      <figcaption className="mt-1 font-serif text-[11px] italic text-ink/60">
        Photograph via {story.sourceName}
      </figcaption>
    </figure>
  );
}

function Masthead({ edition }: { edition: Edition }) {
  return (
    <header className="text-center">
      <div className="flex flex-col items-center justify-between gap-1 border-y border-ink py-1.5 font-condensed text-[11px] uppercase tracking-[0.25em] md:flex-row">
        <span>Vol. I · No. {issueNumber(edition.editionDate)}</span>
        <span>Personal edition for {edition.masthead.readerName}</span>
        <span>{longDate(edition.editionDate)}</span>
      </div>
      <h1 className="mt-5 font-blackletter text-5xl leading-none sm:text-7xl md:text-8xl">
        {edition.masthead.title}
      </h1>
      <p className="mt-3 font-display text-lg italic">“{edition.masthead.tagline}”</p>
      <div className="mt-5 border-t-4 border-double border-ink" />
    </header>
  );
}

function LeadStory({ story }: { story: Story }) {
  return (
    <StoryShell storyId={story.id}>
      <article>
        <Kicker inverse>{story.topic} · Today&apos;s lead</Kicker>
        <h2 className="mt-4 font-display text-4xl font-black leading-[1.02] tracking-tight md:text-6xl">
          {story.headline}
        </h2>
        {story.dek && <p className="mt-3 font-display text-xl italic text-ink/80">{story.dek}</p>}
        <Photo story={story} className="mt-5" />
        <div className="mt-5 gap-8 font-serif text-[17px] leading-relaxed [column-rule:1px_solid_rgba(23,20,15,0.25)] first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-7xl first-letter:font-black first-letter:leading-[0.8] md:columns-2">
          <p>{story.summary}</p>
        </div>
        <Byline story={story} />
        <Why story={story} />
      </article>
    </StoryShell>
  );
}

function Sidebar({ edition }: { edition: Edition }) {
  return (
    <aside className="space-y-8 lg:col-span-4 lg:border-l lg:border-ink lg:pl-8">
      <div className="border-2 border-ink p-4">
        <p className="font-condensed text-xs uppercase tracking-[0.25em]">From the Editor</p>
        <p className="mt-3 font-serif italic leading-relaxed">{edition.editorNote}</p>
      </div>
      <div>
        <p className="border-b-2 border-ink pb-1 font-condensed text-xs uppercase tracking-[0.25em]">
          Inside Today
        </p>
        <ol className="divide-y divide-ink/20">
          {edition.sections.map((section) => (
            <li key={section.name}>
              <a
                href={`#${slug(section.name)}`}
                className="flex items-baseline justify-between py-2 font-display text-lg hover:italic"
              >
                <span>{section.name}</span>
                <span className="font-condensed text-sm">{section.stories.length}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function StoryCard({ story }: { story: Story }) {
  const feature = story.size === "feature";
  return (
    <StoryShell
      storyId={story.id}
      className={cn("py-5 md:px-6 md:first:pl-0 md:last:pr-0", feature && "md:col-span-2")}
    >
      <article>
        <Kicker>{story.topic}</Kicker>
        <h3
          className={cn(
            "mt-3 font-display font-bold leading-tight tracking-tight",
            feature ? "text-3xl md:text-4xl" : "text-2xl",
          )}
        >
          {story.headline}
        </h3>
        {story.dek && <p className="mt-2 font-display italic text-ink/80">{story.dek}</p>}
        {feature && <Photo story={story} className="mt-4" />}
        <p className={cn("mt-3 font-serif leading-relaxed", feature && "md:columns-2 md:gap-6")}>
          {story.summary}
        </p>
        <Byline story={story} />
        <Why story={story} />
      </article>
    </StoryShell>
  );
}

function Briefs({ stories }: { stories: Story[] }) {
  return (
    <div className="mt-6 border-y-4 border-double border-ink py-4">
      <p className="text-center font-display text-xl font-bold tracking-[0.4em]">
        BRIEFS <span className="font-normal italic tracking-normal">· in a sentence or two</span>
      </p>
      <ul className="mt-3 grid gap-x-10 md:grid-cols-2">
        {stories.map((s) => (
          <li key={s.id} className="border-b border-dotted border-ink/40 py-3">
            <StoryShell storyId={s.id} compact>
              <OriginalLink storyId={s.id} href={s.url} className="font-serif font-semibold hover:underline">
                {s.headline}.
              </OriginalLink>{" "}
              <span className="font-serif text-sm text-ink/80">{s.summary}</span>
              <p className="mt-1 font-condensed text-[10px] uppercase tracking-[0.2em] text-ink/60">
                {s.sourceName}
              </p>
            </StoryShell>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Section({ name, stories }: { name: string; stories: Story[] }) {
  const main = stories.filter((s) => s.size !== "brief");
  const briefs = stories.filter((s) => s.size === "brief");
  return (
    <section id={slug(name)} className="mt-12 scroll-mt-6">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-ink" />
        <h2 className="bg-ink px-5 py-1 font-display text-2xl font-bold italic text-paper md:text-3xl">
          {name}
        </h2>
        <span className="h-px flex-1 bg-ink" />
      </div>
      {main.length > 0 && (
        <div className="mt-2 grid divide-y divide-ink/30 md:grid-cols-3 md:divide-x md:divide-y-0">
          {main.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
      {briefs.length > 0 && <Briefs stories={briefs} />}
    </section>
  );
}

type NewspaperProps = { editionId: string; edition: Edition; hiddenStoryIds: string[] };

export function Newspaper({ editionId, edition, hiddenStoryIds }: NewspaperProps) {
  const all = edition.sections.flatMap((s) => s.stories);
  const lead = all.find((s) => s.id === edition.leadStoryId) ?? all[0];

  return (
    <FeedbackProvider editionId={editionId} hiddenStoryIds={hiddenStoryIds}>
      <div className="mx-auto max-w-6xl bg-paper px-4 py-6 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] md:px-10 md:py-10">
        <Masthead edition={edition} />

        <section className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <LeadStory story={lead} />
          </div>
          <Sidebar edition={edition} />
        </section>

        {edition.sections.map((section) => {
          const stories = section.stories.filter((s) => s.id !== lead.id);
          return stories.length > 0 ? <Section key={section.name} name={section.name} stories={stories} /> : null;
        })}

        <footer className="mt-14 border-y-4 border-double border-ink py-3 text-center font-display text-lg italic">
          ★ Read slowly. Think freely. Come back tomorrow. ★
        </footer>
      </div>
    </FeedbackProvider>
  );
}