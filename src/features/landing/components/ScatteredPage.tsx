"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import type { ScatteredPageData } from "../constants";

const PAPER = "#f3eee3";
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.26 0 0 0 0 0.18 0 0 0 0.12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const LIGHT = "linear-gradient(135deg, rgba(255,255,255,0.45), rgba(0,0,0,0.08))";

/** Dense small print, like newspaper body text. */
function Print({ lines = 4 }: { lines?: number }) {
  return (
    <div className="space-y-[0.32em]">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-[0.28em] bg-neutral-800/55"
          style={{ width: i === lines - 1 ? "62%" : `${92 + ((i * 37) % 9)}%` }}
        />
      ))}
    </div>
  );
}

/** A real photograph, printed in newsprint grayscale. */
function Photo({ seed, className = "aspect-[5/3]" }: { seed: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://picsum.photos/seed/${seed}/480/288?grayscale`}
      alt=""
      loading="lazy"
      draggable={false}
      className={`w-full object-cover contrast-125 ${className}`}
    />
  );
}

function Content({ page }: { page: ScatteredPageData }) {
  switch (page.kind) {
    case "article":
      return (
        <div className="space-y-[0.55em] p-[0.9em]">
          <p className="border-b border-neutral-800 pb-[0.2em] font-condensed text-[0.7em] font-semibold uppercase tracking-[0.2em]">
            {page.outlet}
          </p>
          <p className="font-display text-[1.1em] font-bold leading-tight">{page.headline}</p>
          <Photo seed={page.seed} />
          <div className="grid grid-cols-2 gap-[0.6em]">
            <Print lines={5} />
            <Print lines={5} />
          </div>
        </div>
      );
    case "newsletter":
      return (
        <div className="space-y-[0.5em] p-[0.9em]">
          <p className="text-[0.62em] text-neutral-600">From: {page.outlet}</p>
          <p className="text-[0.82em] font-semibold leading-snug">{page.headline}</p>
          <div className="border-t border-neutral-400" />
          <Print lines={6} />
          <p className="pt-[0.2em] text-[0.55em] text-neutral-500 underline">Unsubscribe</p>
        </div>
      );
    case "post":
      return (
        <div className="space-y-[0.55em] p-[0.9em]">
          <div className="flex items-center gap-[0.5em]">
            <Photo seed={`${page.seed}-avatar`} className="aspect-square !w-[1.9em] rounded-full" />
            <p className="text-[0.7em] font-semibold">{page.outlet}</p>
          </div>
          <p className="text-[0.85em] leading-snug">{page.headline}</p>
          <Photo seed={page.seed} className="aspect-[16/9]" />
          <p className="text-[0.6em] text-neutral-600">♥ 2.1k · ↻ 340 · 💬 98</p>
        </div>
      );
    case "live":
      return (
        <div className="space-y-[0.5em] p-[0.9em]">
          <div className="flex items-center gap-[0.5em]">
            <span className="bg-red-700 px-[0.5em] py-[0.1em] text-[0.6em] font-bold text-white">LIVE</span>
            <span className="font-condensed text-[0.65em] font-semibold uppercase tracking-[0.15em]">{page.outlet}</span>
          </div>
          <p className="font-display text-[1em] font-bold leading-tight">{page.headline}</p>
          {["09:41", "09:28", "09:12"].map((t) => (
            <div key={t} className="grid grid-cols-[2.6em_1fr] items-center gap-[0.4em]">
              <span className="text-[0.55em] font-bold text-red-700">{t}</span>
              <Print lines={2} />
            </div>
          ))}
        </div>
      );
    case "tabs":
      return (
        <div>
          <div className="flex gap-[0.25em] bg-neutral-300/70 px-[0.5em] pt-[0.4em]">
            {["", "", "", "+44"].map((label, i) => (
              <div
                key={i}
                className="h-[1.2em] flex-1 rounded-t-sm bg-[#efe9dc] text-center text-[0.5em] leading-[2.4em] text-neutral-600"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="space-y-[0.5em] p-[0.9em]">
            <div className="rounded-full bg-neutral-300/60 px-[0.6em] py-[0.2em] text-[0.55em] text-neutral-600">
              {page.outlet}
            </div>
            <p className="font-display text-[1em] font-bold leading-tight">{page.headline}</p>
            <Photo seed={page.seed} className="aspect-[2/1]" />
            <Print lines={3} />
          </div>
        </div>
      );
  }
}

/** One torn piece of paper: drifts, is gathered into the pile, then shrinks into the ball. */
export function ScatteredPage({ page, progress }: { page: ScatteredPageData; progress: MotionValue<number> }) {
  const x = useTransform(progress, [0, 0.15, 0.42, 0.55], [`${page.x}vw`, `${page.x * 0.92}vw`, `${page.pileX}vw`, "0vw"]);
  const y = useTransform(progress, [0, 0.15, 0.42, 0.55], [`${page.y}vh`, `${page.y * 0.92}vh`, `${page.pileY}vh`, "0vh"]);
  const rotate = useTransform(progress, [0, 0.42, 0.55], [page.r, page.r * 1.5 + page.spin * 0.5, page.spin * 2]);
  const scale = useTransform(progress, [0, 0.15, 0.42, 0.55], [1, 0.96, 0.6, 0.15]);
  const opacity = useTransform(progress, [0.5, 0.57], [1, 0]);

  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity }}
      className="absolute left-1/2 top-1/2 w-[clamp(140px,18vw,250px)] -translate-x-1/2 -translate-y-1/2 text-[clamp(9px,1.05vw,14px)] [filter:drop-shadow(0_14px_16px_rgba(0,0,0,0.55))]"
    >
      <div
        className="relative overflow-hidden text-neutral-900"
        style={{ clipPath: page.clip, backgroundColor: PAPER, backgroundImage: `${GRAIN}, ${LIGHT}` }}
      >
        <Content page={page} />
      </div>
    </motion.div>
  );
}
