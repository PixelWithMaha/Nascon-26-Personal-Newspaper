"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadPdfButton } from "@/features/edition";
import { issueNumber, longDate } from "@/features/edition/format";
import type { EditionSummary } from "../schemas";

const VISIBLE_BEHIND = 5;
const STEP_Y = 60; // how far each older paper rises (px)
const STEP_Z = 110; // how far each older paper recedes (px)

// Card size: as big as possible while the whole front page fits on screen.
const CARD_WIDTH = "min(600px, 90vw, calc((100dvh - 230px) * 0.8))";

function cardStyle(offset: number): CSSProperties {
  if (offset < 0) {
    return {
      transform: "translate3d(0, 115%, 200px) rotateX(-28deg)",
      opacity: 0,
      zIndex: 200,
      pointerEvents: "none",
    };
  }
  const depth = Math.min(offset, VISIBLE_BEHIND + 1);
  return {
    transform: `translate3d(0, ${-depth * STEP_Y}px, ${-depth * STEP_Z}px) rotateX(${offset === 0 ? 0 : 12 + depth * 2}deg)`,
    filter: offset === 0 ? undefined : `brightness(${1 - depth * 0.09})`,
    opacity: offset > VISIBLE_BEHIND ? 0 : 1,
    zIndex: 100 - depth,
    pointerEvents: offset > VISIBLE_BEHIND ? "none" : "auto",
  };
}

const outlineOnDark = "border-paper/40 bg-transparent text-paper hover:bg-paper hover:text-ink";

function MiniFrontPage({ edition, age }: { edition: EditionSummary; age: number }) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden border border-ink/20 bg-paper p-5 text-left text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] sm:p-7"
      style={{ filter: `sepia(${Math.min(age * 0.05, 0.35)})` }}
    >
      <div className="flex justify-between border-y border-ink py-1 font-condensed text-[10px] uppercase tracking-[0.2em]">
        <span>No. {issueNumber(edition.editionDate)}</span>
        <span>{longDate(edition.editionDate)}</span>
      </div>
      <p className="mt-4 text-center font-blackletter text-4xl leading-none sm:text-6xl">The Morning Paper</p>
      <p className="mt-2 line-clamp-1 text-center font-display text-sm italic">“{edition.tagline}”</p>
      <div className="mt-4 border-t-4 border-double border-ink" />

      <span className="mt-4 self-start bg-ink px-2 py-0.5 font-condensed text-[10px] uppercase tracking-[0.2em] text-paper">
        {edition.leadTopic}
      </span>
      <h2 className="mt-3 line-clamp-3 font-display text-2xl font-black leading-tight sm:text-4xl">
        {edition.leadHeadline}
      </h2>
      {edition.leadDek && (
        <p className="mt-2 line-clamp-2 font-display text-base italic text-ink/75">{edition.leadDek}</p>
      )}

      <div className="mt-auto grid grid-cols-3 gap-4 border-t border-ink pt-3">
        {edition.sections.slice(0, 3).map((s) => (
          <div key={s.name} className="min-w-0">
            <p className="truncate font-condensed text-[10px] uppercase tracking-[0.2em]">{s.name}</p>
            <p className="mt-1 line-clamp-3 font-serif text-xs leading-snug">{s.headline}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center font-condensed text-[10px] uppercase tracking-[0.25em] text-ink/60">
        {edition.storyCount} stories · Personal edition for {edition.readerName}
      </p>
    </div>
  );
}

export function EditionStack({ editions }: { editions: EditionSummary[] }) {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);
  const dragStart = useRef<number | null>(null);
  const count = editions.length;

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(count - 1, Math.max(0, index));
      activeRef.current = next;
      setActive(next);
    },
    [count],
  );
  const step = useCallback((delta: number) => goTo(activeRef.current + delta), [goTo]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const dir = e.deltaY > 0 ? 1 : -1;
      const atEdge = (dir === -1 && activeRef.current === 0) || (dir === 1 && activeRef.current === count - 1);
      if (atEdge || Math.abs(e.deltaY) < 8) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelLock.current = now + 450;
      step(dir);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count, step]);

  const current = editions[active];
  const behind = Math.min(VISIBLE_BEHIND, count - 1);

  return (
    <div className="relative">
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Your past editions"
        tabIndex={0}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowRight", "PageDown"].includes(e.key)) {
            e.preventDefault();
            step(1);
          } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
            e.preventDefault();
            step(-1);
          } else if (e.key === "Enter") {
            router.push(`/archive/${current.id}`);
          }
        }}
        onPointerDown={(e) => {
          dragStart.current = e.clientY;
        }}
        onPointerUp={(e) => {
          if (dragStart.current === null) return;
          const moved = dragStart.current - e.clientY;
          dragStart.current = null;
          if (Math.abs(moved) > 50) step(moved > 0 ? 1 : -1);
        }}
        className="relative mx-auto w-full touch-none select-none outline-none [perspective:1600px] [perspective-origin:50%_30%] focus-visible:ring-2 focus-visible:ring-paper/50"
        style={{ height: `calc(${CARD_WIDTH} * 1.25 + ${Math.round(behind * STEP_Y * 0.7) + 24}px)` }}
      >
        <div className="absolute inset-x-0 bottom-0 flex justify-center [transform-style:preserve-3d]">
          {editions.map((edition, i) => {
            const offset = i - active;
            return (
              <div
                key={edition.id}
                aria-hidden={offset !== 0}
                className="absolute bottom-0 aspect-[4/5] transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
                style={{ ...cardStyle(offset), width: CARD_WIDTH, transformOrigin: "50% 100%" }}
              >
                {offset === 0 ? (
                  <Link
                    href={`/archive/${edition.id}`}
                    aria-label={`Read the edition of ${longDate(edition.editionDate)}`}
                    className="block h-full"
                    draggable={false}
                  >
                    <MiniFrontPage edition={edition} age={i} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => goTo(i)}
                    className="block h-full w-full cursor-pointer"
                  >
                    <MiniFrontPage edition={edition} age={i} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 text-center">
        <p aria-live="polite" className="font-condensed text-xs uppercase tracking-[0.25em] text-paper/70">
          Edition {active + 1} of {count} · {longDate(current.editionDate)}
        </p>
        <div className="flex flex-wrap items-start justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => step(-1)}
            disabled={active === 0}
            className={cn("font-condensed uppercase tracking-widest", outlineOnDark)}
          >
            ↑ Newer
          </Button>
          <Button asChild className="bg-paper font-condensed uppercase tracking-widest text-ink hover:bg-paper/90">
            <Link href={`/archive/${current.id}`}>Read this edition</Link>
          </Button>
          <DownloadPdfButton editionId={current.id} editionDate={current.editionDate} className={outlineOnDark} />
          <Button
            variant="outline"
            onClick={() => step(1)}
            disabled={active === count - 1}
            className={cn("font-condensed uppercase tracking-widest", outlineOnDark)}
          >
            Older ↓
          </Button>
        </div>
      </div>

      {/* Date rail floats at the right edge so the stack stays centred on the page. */}
      <nav aria-label="Jump to a date" className="absolute right-0 top-0 hidden w-44 xl:block">
        <p className="border-b border-paper/40 pb-1 font-condensed text-xs uppercase tracking-[0.25em] text-paper/70">
          By date
        </p>
        <ol className="mt-2 max-h-[60vh] space-y-1 overflow-y-auto pr-2">
          {editions.map((edition, i) => (
            <li key={edition.id}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === active ? "true" : undefined}
                className={cn(
                  "w-full py-1 text-left font-display text-sm transition-colors",
                  i === active ? "italic text-paper" : "text-paper/50 hover:text-paper",
                )}
              >
                {new Date(`${edition.editionDate}T12:00:00Z`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  timeZone: "UTC",
                })}
              </button>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}