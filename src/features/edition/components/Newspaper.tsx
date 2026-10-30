import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Edition, Story } from "../schemas";
import { issueNumber, longDate } from "../format";
import { FeedbackProvider } from "./FeedbackProvider";
import { NewsPhoto } from "./NewsPhoto";
import { OriginalLink } from "./OriginalLink";
import { StoryShell } from "./StoryShell";
import { WordSearch } from "./WordSearch";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/* ---------- Small pieces ---------- */

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
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-condensed text-[11px] uppercase tracking-[0.2em] text-ink/70">
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

function Sheet({ page, label, children }: { page: number; label: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl bg-paper px-5 py-6 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] md:px-10 md:py-8">
      {children}
      <p className="mt-8 border-t border-ink pt-2 text-center font-condensed text-[10px] uppercase tracking-[0.3em] text-ink/60">
        The Morning Paper · {label} · Page {page}
      </p>
    </section>
  );
}

/* ---------- Front page ---------- */

function Masthead({ edition, sections }: { edition: Edition; sections: { name: string; anchor?: string }[] }) {
  return (
    <header className="text-center">
      <div className="flex flex-col items-center justify-between gap-1 font-condensed text-[11px] uppercase tracking-[0.25em] md:flex-row">
        <span>Vol. I · No. {issueNumber(edition.editionDate)}</span>
        <span>Personal edition for {edition.masthead.readerName}</span>
        <span>{longDate(edition.editionDate)}</span>
      </div>
      <h1 className="mt-4 font-blackletter text-5xl leading-none sm:text-7xl md:text-8xl">{edition.masthead.title}</h1>
      <p className="mt-2 font-display text-base italic md:text-lg">“{edition.masthead.tagline}”</p>
      <nav className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 border-y-2 border-ink py-2 font-condensed text-xs uppercase tracking-[0.25em]">
        {sections.map((s) =>
          s.anchor ? (
            <a key={s.name} href={`#${s.anchor}`} className="hover:underline">
              {s.name}
            </a>
          ) : (
            <span key={s.name}>{s.name}</span>
          ),
        )}
      </nav>
    </header>
  );
}

function LeadStory({ story }: { story: Story }) {
  return (
    <StoryShell storyId={story.id}>
      <article>
        <Kicker inverse>{story.topic} · Today&apos;s lead</Kicker>
        <h2 className="mt-3 font-display text-4xl font-black leading-[1.02] tracking-tight md:text-5xl">
          {story.headline}
        </h2>
        {story.dek && <p className="mt-2 font-display text-lg italic text-ink/80">{story.dek}</p>}
        <figure className="mt-4">
          <NewsPhoto src={story.imageUrl} topic={story.topic} className="aspect-[16/10] border border-ink/20" />
                    <figcaption className="mt-1 font-serif text-[11px] italic text-ink/60">
            {story.imageCredit ?? `Illustration · ${story.topic}`}
          </figcaption>
        </figure>
        <div className="mt-4 gap-6 font-serif text-[16px] leading-relaxed [column-rule:1px_solid_rgba(23,20,15,0.25)] first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-6xl first-letter:font-black first-letter:leading-[0.8] md:columns-2">
          <p>{story.summary}</p>
        </div>
        <Byline story={story} />
        <Why story={story} />
      </article>
    </StoryShell>
  );
}

function RailStory({ story }: { story: Story }) {
  return (
    <StoryShell storyId={story.id} compact className="py-4 first:pt-0">
      <article>
        <h3 className="font-display text-xl font-bold leading-tight">{story.headline}</h3>
        <NewsPhoto src={story.imageUrl} topic={story.topic} className="mt-2 aspect-[4/3] border border-ink/20" />
        <p className="mt-2 line-clamp-5 font-serif text-sm leading-relaxed">{story.summary}</p>
        <Byline story={story} />
      </article>
    </StoryShell>
  );
}

function LatestNews({ stories, note }: { stories: Story[]; note: string }) {
  return (
    <aside className="lg:col-span-3 lg:border-l lg:border-ink lg:pl-6">
      <div className="border-2 border-ink p-3">
        <p className="font-condensed text-[11px] uppercase tracking-[0.25em]">From the Editor</p>
        <p className="mt-2 font-serif text-sm italic leading-relaxed">{note}</p>
      </div>
      {stories.length > 0 && (
        <>
          <h3 className="mt-5 border-b-2 border-ink pb-1 font-display text-2xl font-black">Latest News</h3>
          <ul className="divide-y divide-ink/20">
            {stories.map((s) => (
              <li key={s.id} className="py-3">
                <StoryShell storyId={s.id} compact>
                  <p className="font-condensed text-[10px] uppercase tracking-[0.2em] text-ink/60">
                    ■ {s.topic} · {s.sourceName}
                  </p>
                  <OriginalLink
                    storyId={s.id}
                    href={s.url}
                    className="mt-1 block font-serif text-base font-semibold leading-snug hover:underline"
                  >
                    {s.headline}
                  </OriginalLink>
                  <p className="mt-1 line-clamp-3 font-serif text-sm text-ink/80">{s.summary}</p>
                </StoryShell>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}

function CardStory({ story }: { story: Story }) {
  return (
    <StoryShell storyId={story.id} className="py-4 md:px-5 md:first:pl-0 md:last:pr-0">
      <article>
        <NewsPhoto src={story.imageUrl} topic={story.topic} className="aspect-[3/2] border border-ink/20" />
        <div className="mt-3">
          <Kicker>{story.topic}</Kicker>
        </div>
        <h3 className="mt-2 font-display text-xl font-bold leading-tight">{story.headline}</h3>
        <p className="mt-2 line-clamp-5 font-serif text-sm leading-relaxed">{story.summary}</p>
        <Byline story={story} />
        <Why story={story} />
      </article>
    </StoryShell>
  );
}

/* ---------- Section pages ---------- */

function Briefs({ stories }: { stories: Story[] }) {
  return (
    <div className="mt-6 border-y-4 border-double border-ink py-4">
      <p className="text-center font-display text-xl font-bold tracking-[0.4em]">BRIEFS</p>
      <ul className="mt-3 grid gap-x-10 md:grid-cols-2">
        {stories.map((s) => (
          <li key={s.id} className="border-b border-dotted border-ink/40 py-3">
            <StoryShell storyId={s.id} compact>
              <OriginalLink storyId={s.id} href={s.url} className="font-serif font-semibold hover:underline">
                {s.headline}.
              </OriginalLink>{" "}
              <span className="font-serif text-sm text-ink/80">{s.summary}</span>
              <p className="mt-1 font-condensed text-[10px] uppercase tracking-[0.2em] text-ink/60">{s.sourceName}</p>
            </StoryShell>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionPage({ name, stories, page }: { name: string; stories: Story[]; page: number }) {
  const main = stories.filter((s) => s.size !== "brief");
  const briefs = stories.filter((s) => s.size === "brief");
  const [first, ...others] = main;

  return (
    <Sheet page={page} label={name}>
      <header
        id={slug(name)}
        className="flex scroll-mt-6 items-end justify-between border-b-4 border-double border-ink pb-2"
      >
        <h2 className="font-display text-4xl font-black italic md:text-5xl">{name}</h2>
        <span className="font-condensed text-xs uppercase tracking-[0.25em] text-ink/60">Page {page}</span>
      </header>

      {first && (
        <StoryShell storyId={first.id} className="mt-6">
          <article className="grid gap-6 md:grid-cols-5">
            <NewsPhoto src={first.imageUrl} topic={first.topic} className="aspect-[16/10] border border-ink/20 md:col-span-3" />
            <div className="md:col-span-2">
              <Kicker>{first.topic}</Kicker>
              <h3 className="mt-2 font-display text-3xl font-black leading-tight md:text-4xl">{first.headline}</h3>
              {first.dek && <p className="mt-2 font-display italic text-ink/80">{first.dek}</p>}
              <p className="mt-3 font-serif leading-relaxed">{first.summary}</p>
              <Byline story={first} />
              <Why story={first} />
            </div>
          </article>
        </StoryShell>
      )}

      {others.length > 0 && (
        <div className="mt-6 grid divide-y divide-ink/30 border-t border-ink md:grid-cols-3 md:divide-x md:divide-y-0">
          {others.map((s) => (
            <CardStory key={s.id} story={s} />
          ))}
        </div>
      )}

      {briefs.length > 0 && <Briefs stories={briefs} />}
    </Sheet>
  );
}

/* ---------- The whole paper ---------- */

type NewspaperProps = { editionId: string; edition: Edition; hiddenStoryIds: string[] };

export function Newspaper({ editionId, edition, hiddenStoryIds }: NewspaperProps) {
  const all = edition.sections.flatMap((s) => s.stories);
  const lead = all.find((s) => s.id === edition.leadStoryId) ?? all[0];

  // Fill the front page first, preferring stories with photos; the rest go to section pages.
  const used = new Set<string>([lead.id]);
  const byPhoto = all
    .filter((s) => s.id !== lead.id)
    .sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)));
  const take = (fits: (s: Story) => boolean, n: number) => {
    const picked: Story[] = [];
    for (const s of byPhoto) {
      if (picked.length >= n) break;
      if (!used.has(s.id) && fits(s)) {
        picked.push(s);
        used.add(s.id);
      }
    }
    return picked;
  };

  const rail = take((s) => s.size !== "brief", 3);
  // Two stories under the lead keep the centre column as tall as the rail beside it.
  const underLead = take((s) => s.size !== "brief", 2);
  const latest = take((s) => s.size === "brief", 6);
  if (latest.length < 4) latest.push(...take(() => true, 4 - latest.length));
  const belowFold = take((s) => s.size !== "brief", 4);

  const sectionPages = edition.sections
    .map((section) => ({ name: section.name, stories: section.stories.filter((s) => !used.has(s.id)) }))
    .filter((section) => section.stories.length > 0);
  const anchors = new Set(sectionPages.map((s) => s.name));

  return (
    <FeedbackProvider editionId={editionId} hiddenStoryIds={hiddenStoryIds}>
      <div className="space-y-8">
        <Sheet page={1} label="Front page">
          <Masthead
            edition={edition}
            sections={edition.sections.map((s) => ({ name: s.name, anchor: anchors.has(s.name) ? slug(s.name) : undefined }))}
          />

          <div className="mt-6 grid gap-6 lg:grid-cols-12">
            {rail.length > 0 && (
              <div className="divide-y divide-ink/30 lg:col-span-3 lg:border-r lg:border-ink lg:pr-6">
                {rail.map((s) => (
                  <RailStory key={s.id} story={s} />
                ))}
              </div>
            )}
            <div className={rail.length > 0 ? "lg:col-span-6" : "lg:col-span-9"}>
              <LeadStory story={lead} />
              {underLead.length > 0 && (
                <div className="mt-6 grid divide-y divide-ink/30 border-t-2 border-ink md:grid-cols-2 md:divide-x md:divide-y-0">
                  {underLead.map((s) => (
                    <CardStory key={s.id} story={s} />
                  ))}
                </div>
              )}
            </div>
            <LatestNews stories={latest} note={edition.editorNote} />
          </div>

          {belowFold.length > 0 && (
            <div className="mt-8 grid divide-y divide-ink/30 border-t-4 border-double border-ink md:grid-cols-4 md:divide-x md:divide-y-0">
              {belowFold.map((s) => (
                <CardStory key={s.id} story={s} />
              ))}
            </div>
          )}
        </Sheet>

        {sectionPages.map((section, i) => (
          <SectionPage key={section.name} name={section.name} stories={section.stories} page={i + 2} />
        ))}
                {sectionPages.map((section, i) => (
          <SectionPage key={section.name} name={section.name} stories={section.stories} page={i + 2} />
        ))}

        <WordSearch edition={edition} />

        <footer className="mx-auto max-w-6xl border-y-4 border-double border-ink/60 py-3 text-center font-display text-lg italic text-ink"></footer>

        <footer className="mx-auto max-w-6xl border-y-4 border-double border-ink/60 py-3 text-center font-display text-lg italic text-ink">
          ★ Read slowly. Think freely. Come back tomorrow. ★
        </footer>
      </div>
    </FeedbackProvider>
  );
}