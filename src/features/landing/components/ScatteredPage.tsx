"use client";

import { motion, useTransform, type MotionValue } from "motion/react";
import type { ScatteredPageData } from "../constants";

const line = (w: string) => <div className="h-[0.35em] rounded-full bg-neutral-300" style={{ width: w }} />;

function Content({ page }: { page: ScatteredPageData }) {
  switch (page.kind) {
    case "article":
      return (
        <div className="space-y-[0.6em] p-[0.9em]">
          <p className="font-condensed text-[0.7em] font-semibold uppercase tracking-[0.2em] text-neutral-500">{page.outlet}</p>
          <p className="font-display text-[1.05em] font-bold leading-tight text-neutral-900">{page.headline}</p>
          <div className="aspect-[16/9] rounded-sm bg-neutral-200" />
          {line("100%")}
          {line("92%")}
          {line("70%")}
        </div>
      );
    case "newsletter":
      return (
        <div className="space-y-[0.5em] p-[0.9em]">
          <p className="text-[0.65em] text-neutral-500">From: {page.outlet}</p>
          <p className="text-[0.8em] font-semibold text-neutral-900">{page.headline}</p>
          <div className="border-t border-neutral-200" />
          {line("100%")}
          {line("85%")}
          {line("95%")}
          {line("60%")}
          <p className="pt-[0.3em] text-[0.55em] text-neutral-400 underline">Unsubscribe</p>
        </div>
      );
    case "post":
      return (
        <div className="space-y-[0.6em] p-[0.9em]">
          <div className="flex items-center gap-[0.5em]">
            <div className="size-[1.8em] rounded-full bg-neutral-300" />
            <p className="text-[0.7em] font-semibold text-neutral-800">{page.outlet}</p>
          </div>
          <p className="text-[0.85em] leading-snug text-neutral-900">{page.headline}</p>
          <p className="text-[0.6em] text-neutral-500">♥ 2.1k · ↻ 340 · 💬 98</p>
        </div>
      );
    case "live":
      return (
        <div className="space-y-[0.55em] p-[0.9em]">
          <div className="flex items-center gap-[0.5em]">
            <span className="rounded-sm bg-red-600 px-[0.5em] py-[0.1em] text-[0.6em] font-bold text-white">LIVE</span>
            <span className="text-[0.65em] font-semibold text-neutral-600">{page.outlet}</span>
          </div>
          <p className="font-display text-[0.95em] font-bold leading-tight text-neutral-900">{page.headline}</p>
          {["09:41", "09:28", "09:12"].map((t) => (
            <div key={t} className="flex items-center gap-[0.5em]">
              <span className="text-[0.55em] font-semibold text-red-600">{t}</span>
              {line("80%")}
            </div>
          ))}
        </div>
      );
    case "tabs":
      return (
        <div>
          <div className="flex gap-[0.25em] bg-neutral-200 px-[0.5em] pt-[0.4em]">
            {["", "", "", "+44"].map((label, i) => (
              <div key={i} className="h-[1.2em] flex-1 rounded-t-sm bg-neutral-100 text-center text-[0.5em] leading-[2.4em] text-neutral-500">
                {label}
              </div>
            ))}
          </div>
          <div className="space-y-[0.5em] p-[0.9em]">
            <div className="rounded-full bg-neutral-100 px-[0.6em] py-[0.2em] text-[0.55em] text-neutral-500">{page.outlet}</div>
            <p className="font-display text-[0.95em] font-bold leading-tight text-neutral-900">{page.headline}</p>
            {line("100%")}
            {line("75%")}
          </div>
        </div>
      );
  }
}

/** One page: drifts, is gathered into the pile, then shrinks into the ball. */
export function ScatteredPage({ page, progress }: { page: ScatteredPageData; progress: MotionValue<number> }) {
  const x = useTransform(progress, [0, 0.15, 0.42, 0.55], [`${page.x}vw`, `${page.x * 0.92}vw`, `${page.pileX}vw`, "0vw"]);
  const y = useTransform(progress, [0, 0.15, 0.42, 0.55], [`${page.y}vh`, `${page.y * 0.92}vh`, `${page.pileY}vh`, "0vh"]);
  const rotate = useTransform(progress, [0, 0.42, 0.55], [page.r, page.r * 1.5 + page.spin * 0.5, page.spin * 2]);
  const scale = useTransform(progress, [0, 0.15, 0.42, 0.55], [1, 0.96, 0.6, 0.15]);
  const opacity = useTransform(progress, [0.5, 0.57], [1, 0]);

  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity }}
      className="absolute left-1/2 top-1/2 w-[clamp(130px,18vw,250px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-sm bg-white text-[clamp(9px,1.05vw,14px)] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]"
    >
      <Content page={page} />
    </motion.div>
  );
}