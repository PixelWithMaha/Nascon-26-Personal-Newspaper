"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FeedbackSignal } from "../schemas";
import { useFeedback, useStorySignal } from "./FeedbackProvider";

const READ_AFTER_MS = 30_000;
const REMOVES: FeedbackSignal[] = ["skip", "dislike", "less_like_this"];

const ACTIONS: { signal: FeedbackSignal; label: string }[] = [
  { signal: "like", label: "More like this" },
  { signal: "less_like_this", label: "Less like this" },
  { signal: "skip", label: "Skip" },
];

type Props = { storyId: string; compact?: boolean; className?: string; children: ReactNode };

export function StoryShell({ storyId, compact = false, className, children }: Props) {
  const { hidden, hide } = useFeedback();
  const send = useStorySignal(storyId);
  const [liked, setLiked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // "read": the story was at least partly on screen for 30 seconds in total.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visibleSince: number | null = null;
    let total = 0;
    let done = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) visibleSince = Date.now();
        else if (visibleSince !== null) {
          total += Date.now() - visibleSince;
          visibleSince = null;
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);

    const interval = setInterval(() => {
      if (done || visibleSince === null) return;
      const elapsed = total + (Date.now() - visibleSince);
      if (elapsed >= READ_AFTER_MS) {
        done = true;
        send("read", Math.round(elapsed / 1000));
        observer.disconnect();
        clearInterval(interval);
      }
    }, 2000);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, [send]);

  if (hidden.has(storyId)) {
    return (
      <div className={cn("py-3 font-condensed text-[11px] uppercase tracking-[0.2em] text-ink/50", className)}>
        Removed from your paper · we&apos;ll learn from it
      </div>
    );
  }

  function act(signal: FeedbackSignal) {
    send(signal);
    if (signal === "like") setLiked(true);
    if (REMOVES.includes(signal)) hide(storyId);
  }

  return (
    <div ref={ref} className={className}>
      {children}
      <div className={cn("flex flex-wrap items-center gap-2", compact ? "mt-1" : "mt-3")}>
        {liked ? (
          <span className="font-condensed text-[11px] uppercase tracking-[0.2em] text-ink/70">
            Noted · more like this tomorrow
          </span>
        ) : (
          ACTIONS.map(({ signal, label }) => (
            <button
              key={signal}
              type="button"
              onClick={() => act(signal)}
              className="border border-ink/30 px-2 py-0.5 font-condensed text-[10px] uppercase tracking-[0.2em] text-ink/70 transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              {label}
            </button>
          ))
        )}
      </div>
    </div>
  );
}