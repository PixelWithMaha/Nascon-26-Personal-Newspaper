"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DownloadPdfButton } from "@/features/edition";
import { issueNumber, longDate } from "@/features/edition/format";
import type { EditionSummary } from "../schemas";

const VISIBLE_BEHIND = 5;
// 3D settings, all relative to the front paper's height (H):
const TILT_DEG = 12; // older papers lean back by this much
const DEPTH = 0.14; // each older paper sits this many H further back
const CAMERA = 3; // camera distance in H (smaller = stronger perspective)
const PEEK = 0.05; // how much of each older paper shows above the one in front, in H
const ASPECT = 0.88; // paper width ÷ height
const MAX_WIDTH_SHARE = 0.94; // never wider than this share of the stage
const STACK_FACTOR = 1 + VISIBLE_BEHIND * PEEK + 0.05; // stage height needed, in H
const WHEEL_COOLDOWN_MS = 450;

const SIN = Math.sin((TILT_DEG * Math.PI) / 180);
const COS = Math.cos((TILT_DEG * Math.PI) / 180);

type Card = { width: number; height: number };

/**
 * Each paper carries its own perspective camera, so the 3D look renders the same in every browser.
 * For a paper `d` places back, solve how far it must rise so its top edge shows exactly PEEK above the
 * paper in front, after it has been tilted, pushed back and shrunk by perspective.
 */
function transformFor(d: number, h: number): string {
  const camera = CAMERA * h;
  if (d === 0) return `perspective(${camera}px) translate3d(0, 0, 0) rotateX(0deg)`;
  const depth = d * DEPTH;
  const targetTop = 1 + d * PEEK;
  const rise = (targetTop * (CAMERA + SIN + depth)) / CAMERA - COS;
  return `perspective(${camera}px) translate3d(0, ${(-rise * h).toFixed(1)}px, ${(-depth * h).toFixed(1)}px) rotateX(${TILT_DEG}deg)`;
}

function cardStyle(offset: number, card: Card): CSSProperties {
  const h = card.height;
  if (offset < 0) {
    // Leafed past: tips toward you and falls away, then is fully hidden.
    return {
      transform: `perspective(${CAMERA * h}px) translate3d(0, ${(0.4 * h).toFixed(1)}px, ${(0.25 * h).toFixed(1)}px) rotateX(-25deg)`,
      opacity: 0,
      visibility: "hidden",
      zIndex: 200,
      pointerEvents: "none",
    };
  }
  const d = Math.min(offset, VISIBLE_BEHIND + 1);
  return {
    transform: transformFor(d, h),
    filter: d === 0 ? undefined : `brightness(${1 - d * 0.09})`,
    opacity: offset > VISIBLE_BEHIND ? 0 : 1,
    visibility: offset > VISIBLE_BEHIND ? "hidden" : "visible",
    zIndex: 100 - d,
    pointerEvents: offset > VISIBLE_BEHIND ? "none" : "auto",
  };
}

const outlineOnDark = "border-paper/40 bg-transparent! text-paper! hover:bg-paper! hover:text-ink!";

/** A front page. Everything inside scales with the paper's width (cqw). No drop shadow. */
function MiniFrontPage({ edition, age }: { edition: EditionSummary; age: number }) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden border border-ink/25 bg-paper p-[5cqw] text-left text-ink"
      style={{ filter: `sepia(${Math.min(age * 0.05, 0.35)})` }}
    >
      <div className="flex justify-between border-y border-ink py-[0.8cqw] font-condensed text-[1.9cqw] uppercase tracking-[0.2em]">
        <span>No. {issueNumber(edition.editionDate)}</span>
        <span>{longDate(edition.editionDate)}</span>
      </div>
      <p className="mt-[3cqw] text-center font-blackletter text-[10cqw] leading-none">The Morning Paper</p>
      <p className="mt-[1.5cqw] line-clamp-1 text-center font-display text-[2.4cqw] italic">
        “{edition.tagline}”
      </p>
      <div className="mt-[3cqw] border-t-4 border-double border-ink" />

      <span className="mt-[3cqw] self-start bg-ink px-[1.4cqw] py-[0.4cqw] font-condensed text-[1.9cqw] uppercase tracking-[0.2em] text-paper">
        {edition.leadTopic}
      </span>
      <h2 className="mt-[2cqw] line-clamp-3 font-display text-[6.2cqw] font-black leading-[1.08]">
        {edition.leadHeadline}
      </h2>
      {edition.leadDek && (
        <p className="mt-[1.5cqw] line-clamp-2 font-display text-[3cqw] italic text-ink/75">{edition.leadDek}</p>
      )}

      <div className="mt-auto grid grid-cols-3 gap-[3cqw] border-t border-ink pt-[2.5cqw]">
        {edition.sections.slice(0, 3).map((s) => (
          <div key={s.name} className="min-w-0">
            <p className="truncate font-condensed text-[1.8cqw] uppercase tracking-[0.2em]">{s.name}</p>
            <p className="mt-[1cqw] line-clamp-3 font-serif text-[2.4cqw] leading-snug">{s.headline}</p>
          </div>
        ))}
      </div>
      <p className="mt-[2.5cqw] text-center font-condensed text-[1.8cqw] uppercase tracking-[0.25em] text-ink/60">
        {edition.storyCount} stories · Personal edition for {edition.readerName}
      </p>
    </div>
  );
}

export function EditionStack({ editions }: { editions: EditionSummary[] }) {
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const railRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);
  const touchStart = useRef<number | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const count = editions.length;

  // Measure the free space and pick the largest paper that fits with the pile behind it.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const h = Math.min(height / STACK_FACTOR, (width * MAX_WIDTH_SHARE) / ASPECT);
      setCard({ width: Math.round(h * ASPECT), height: Math.round(h) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(count - 1, Math.max(0, index));
      activeRef.current = next;
      setActive(next);
    },
    [count],
  );
  const step = useCallback((delta: number) => goTo(activeRef.current + delta), [goTo]);

  // The whole screen is the control: wheel, swipe and arrow keys all leaf through papers.
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (railRef.current?.contains(e.target as Node)) return; // let the date rail scroll itself
      e.preventDefault();
      if (Math.abs(e.deltaY) < 8) return;
      const now = Date.now();
      if (now < wheelLock.current) return;
      wheelLock.current = now + WHEEL_COOLDOWN_MS;
      step(e.deltaY > 0 ? 1 : -1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchStart.current = e.touches[0]?.clientY ?? null;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStart.current === null) return;
      const moved = touchStart.current - (e.changedTouches[0]?.clientY ?? touchStart.current);
      touchStart.current = null;
      if (Math.abs(moved) > 50) step(moved > 0 ? 1 : -1);
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [step]);

  const current = editions[active];

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Stage: fills the space left on screen; the paper size is measured from it. */}
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Your past editions"
        className="relative min-h-0 flex-1 touch-none select-none"
      >
        <div className="absolute inset-0 flex items-end justify-center">
          {card &&
            editions.map((edition, i) => {
              const offset = i - active;
              return (
                <div
                  key={edition.id}
                  aria-hidden={offset !== 0}
                  className="@container absolute bottom-0 transition-[transform,opacity,filter,visibility] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
                  style={{
                    ...cardStyle(offset, card),
                    width: card.width,
                    height: card.height,
                    transformOrigin: "50% 100%",
                  }}
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

      <div className="shrink-0 pt-4 text-center">
        <p aria-live="polite" className="font-condensed text-xs uppercase tracking-[0.25em] text-paper/70">
          Edition {active + 1} of {count} · {longDate(current.editionDate)}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-center gap-3">
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
          <DownloadPdfButton
            editionId={current.id}
            editionDate={current.editionDate}
            variant="ghost"
            className="border-paper/40 text-paper hover:bg-paper hover:text-ink"
          />
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

      {/* Date rail floats at the right edge so the stack stays centred. */}
      <nav
        ref={railRef}
        aria-label="Jump to a date"
        className="absolute right-0 top-0 hidden max-h-[70%] w-44 overflow-y-auto xl:block"
      >
        <p className="border-b border-paper/40 pb-1 font-condensed text-xs uppercase tracking-[0.25em] text-paper/70">
          By date
        </p>
        <ol className="mt-2 space-y-1 pr-2">
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