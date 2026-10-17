"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SCATTERED_PAGES } from "../constants";
import { ScatteredPage } from "./ScatteredPage";
import { SampleFrontPage } from "./SampleFrontPage";

// Fold lines drawn over the ball and the unfolding page.
const CREASES = [
  "linear-gradient(115deg, transparent 49.4%, rgba(0,0,0,.16) 50%, rgba(255,255,255,.25) 50.6%, transparent 51.2%)",
  "linear-gradient(28deg, transparent 49.4%, rgba(0,0,0,.14) 50%, rgba(255,255,255,.2) 50.6%, transparent 51.2%)",
  "linear-gradient(160deg, transparent 31.4%, rgba(0,0,0,.12) 32%, transparent 32.8%)",
  "linear-gradient(72deg, transparent 67.4%, rgba(0,0,0,.12) 68%, transparent 68.8%)",
  "linear-gradient(140deg, transparent 18.4%, rgba(0,0,0,.1) 19%, transparent 19.8%)",
  "linear-gradient(5deg, transparent 79.4%, rgba(0,0,0,.1) 80%, transparent 80.8%)",
].join(",");

function Caption({
  progress,
  range,
  visibleAtStart = false,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number, number, number];
  visibleAtStart?: boolean;
  children: ReactNode;
}) {
  // Scroll positions must stay within 0–1 for the browser's native animation engine.
  const opacity = useTransform(
    progress,
    visibleAtStart ? [range[2], range[3]] : range,
    visibleAtStart ? [1, 0] : [0, 1, 1, 0],
  );
  const y = useTransform(progress, [range[0], range[1]], visibleAtStart ? [0, 0] : [24, 0]);
  return (
    <motion.p
      style={{ opacity, y }}
      className="pointer-events-none absolute inset-x-0 top-[8vh] z-40 mx-auto max-w-3xl px-6 text-center font-display text-3xl font-bold italic leading-tight text-paper drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:text-5xl"
    >
      {children}
    </motion.p>
  );
}

function CallToAction({ name, setName, returning }: { name: string; setName: (v: string) => void; returning: boolean }) {
  const href = `/onboarding${name.trim() ? `?name=${encodeURIComponent(name.trim())}` : ""}`;
  return (
    <div className="flex flex-col items-center gap-3">
      <label className="flex items-center gap-3 font-condensed text-xs uppercase tracking-[0.25em] text-paper/80">
        Whose paper is this?
        <Input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-9 w-44 border-paper/40 bg-transparent text-paper placeholder:text-paper/40"
        />
      </label>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={href}
          className="bg-paper px-6 py-3 font-condensed text-sm uppercase tracking-[0.2em] text-ink transition hover:bg-paper/90"
        >
          Print my first edition
        </Link>
        {returning && (
          <Link
            href="/paper"
            className="border border-paper/50 px-6 py-3 font-condensed text-sm uppercase tracking-[0.2em] text-paper transition hover:bg-paper hover:text-ink"
          >
            Open today&apos;s paper
          </Link>
        )}
      </div>
    </div>
  );
}

export function CrumpleHero({ returning }: { returning: boolean }) {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLElement>(null);
  const crumpleRef = useRef<SVGFEDisplacementMapElement>(null);
  const unfoldRef = useRef<SVGFEDisplacementMapElement>(null);
  const [name, setName] = useState("");
  const [ctaActive, setCtaActive] = useState(false);

  const { scrollYProgress: p } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });

  // Wrinkles deepen as pages are gathered, then smooth out as the paper unfolds.
  const crumple = useTransform(p, [0.15, 0.52], [0, 42]);
  const unfold = useTransform(p, [0.62, 0.82], [60, 0]);
  useMotionValueEvent(crumple, "change", (v) => crumpleRef.current?.setAttribute("scale", v.toFixed(1)));
  useMotionValueEvent(unfold, "change", (v) => unfoldRef.current?.setAttribute("scale", v.toFixed(1)));
  useMotionValueEvent(p, "change", (v) => setCtaActive(v > 0.86));

  // The paper ball.
  const ballScale = useTransform(p, [0.46, 0.55, 0.62, 0.68], [0, 1, 1.05, 0.9]);
  const ballOpacity = useTransform(p, [0.47, 0.54, 0.63, 0.69], [0, 1, 1, 0]);
  const ballRotate = useTransform(p, [0.47, 0.68], [0, 240]);

  // The front page unfolding out of it.
  const pageOpacity = useTransform(p, [0.63, 0.7], [0, 1]);
  const pageScale = useTransform(p, [0.63, 0.82], [0.3, 1]);
  const pageRotate = useTransform(p, [0.63, 0.82], [-14, 0]);
  const creaseOpacity = useTransform(p, [0.7, 0.88], [0.9, 0]);
  const pdfX = useTransform(p, [0.84, 0.9], ["0%", "70%"]);
  const ctaOpacity = useTransform(p, [0.85, 0.92], [0, 1]);

  if (reduceMotion) {
    return (
      <section className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16">
        <p className="max-w-3xl text-center font-display text-3xl font-bold italic md:text-5xl">
          The news is scattered across dozens of sites. Here it is, in one paper.
        </p>
        <div className="aspect-[4/5] w-[min(480px,86vw)] shadow-2xl">
          <SampleFrontPage name={name} />
        </div>
        <CallToAction name={name} setName={setName} returning={returning} />
      </section>
    );
  }

  return (
    <section ref={sceneRef} className="relative h-[600vh]">
      <svg aria-hidden className="absolute size-0">
        <filter id="crumple">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="4" />
          <feDisplacementMap ref={crumpleRef} in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="unfold">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="9" />
          <feDisplacementMap ref={unfoldRef} in="SourceGraphic" scale="60" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className="sticky top-0 h-dvh overflow-hidden">
                <Caption progress={p} range={[0, 0.05, 0.14, 0.2]} visibleAtStart>
          The news is scattered across dozens of sites.
        </Caption>
        <Caption progress={p} range={[0.2, 0.26, 0.4, 0.46]}>
          Everything you&apos;d read today…
        </Caption>
        <Caption progress={p} range={[0.47, 0.52, 0.6, 0.64]}>
          …pressed into one paper.
        </Caption>
        <Caption progress={p} range={[0.7, 0.76, 0.84, 0.86]}>
          Yours. Every morning.
        </Caption>

        {/* The scattered web, gathered into a pile. One filter on the whole pile keeps it fast. */}
        <div className="absolute inset-0" style={{ filter: "url(#crumple)" }}>
          {SCATTERED_PAGES.map((page) => (
            <ScatteredPage key={page.outlet + page.headline} page={page} progress={p} />
          ))}
        </div>

        {/* The paper ball. */}
        <motion.div
          style={{ scale: ballScale, opacity: ballOpacity, rotate: ballRotate }}
          className="absolute left-1/2 top-1/2 size-[min(34vw,240px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        >
          <div
            className="size-full rounded-full bg-paper shadow-[inset_-22px_-26px_44px_rgba(0,0,0,0.45),inset_16px_16px_30px_rgba(255,255,255,0.5),0_30px_60px_-20px_rgba(0,0,0,0.8)]"
            style={{ backgroundImage: CREASES, filter: "url(#crumple)" }}
          />
        </motion.div>

        {/* The front page, unfolding. */}
        <motion.div
          style={{ opacity: pageOpacity, scale: pageScale, rotate: pageRotate }}
          className="absolute left-1/2 top-[54%] aspect-[4/5] w-[min(500px,84vw,calc((100dvh-220px)*0.8))] -translate-x-1/2 -translate-y-1/2"
        >
          <motion.div
            style={{ x: pdfX }}
            className="absolute right-0 top-[12%] -z-10 bg-red-700 px-3 py-6 font-condensed text-xs uppercase tracking-[0.25em] text-white [writing-mode:vertical-rl]"
          >
            Daily PDF ↓
          </motion.div>
          <div className="relative size-full shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]" style={{ filter: "url(#unfold)" }}>
            <SampleFrontPage name={name} />
            <motion.div
              style={{ opacity: creaseOpacity, backgroundImage: CREASES }}
              className="pointer-events-none absolute inset-0"
            />
          </div>
        </motion.div>

        {/* Name field and CTA. */}
        <motion.div
          style={{ opacity: ctaOpacity }}
          className={cn("absolute inset-x-0 bottom-[3vh] z-40", ctaActive ? "pointer-events-auto" : "pointer-events-none")}
        >
          <CallToAction name={name} setName={setName} returning={returning} />
        </motion.div>

        <motion.p
          style={{ opacity: useTransform(p, [0, 0.05], [1, 0]) }}
          className="absolute inset-x-0 bottom-6 z-40 text-center font-condensed text-xs uppercase tracking-[0.3em] text-paper/60"
        >
          Scroll ↓
        </motion.p>
      </div>
    </section>
  );
}