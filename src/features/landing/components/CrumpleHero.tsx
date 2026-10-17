"use client";

import dynamic from "next/dynamic";
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

// three.js only loads in the browser, and only on this page.
const PaperSheet3D = dynamic(() => import("./PaperSheet3D").then((m) => m.PaperSheet3D), { ssr: false });

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
  const opacity = useTransform(
    progress,
    visibleAtStart ? [range[2], range[3]] : range,
    visibleAtStart ? [1, 0] : [0, 1, 1, 0],
  );
  const y = useTransform(progress, [range[0], range[1]], visibleAtStart ? [0, 0] : [24, 0]);
  return (
    <motion.p
      style={{ opacity, y }}
      className="pointer-events-none absolute inset-x-0 top-[6vh] z-40 mx-auto max-w-3xl px-6 text-center font-display text-3xl font-bold italic leading-tight text-paper drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] md:text-5xl"
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
  const [name, setName] = useState("");
  const [ctaActive, setCtaActive] = useState(false);

  const { scrollYProgress: p } = useScroll({ target: sceneRef, offset: ["start start", "end end"] });

  // The torn pages bend slightly as they're gathered together.
  const crumple = useTransform(p, [0.15, 0.5], [0, 16]);
  useMotionValueEvent(crumple, "change", (v) => crumpleRef.current?.setAttribute("scale", v.toFixed(1)));
  useMotionValueEvent(p, "change", (v) => setCtaActive(v > 0.86));

  const ctaOpacity = useTransform(p, [0.86, 0.92], [0, 1]);
  const hintOpacity = useTransform(p, [0, 0.05], [1, 0]);

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

        {/* The scattered web, as torn pieces of paper. */}
        <div className="absolute inset-0 z-10" style={{ filter: "url(#crumple)" }}>
          {SCATTERED_PAGES.map((page) => (
            <ScatteredPage key={page.seed} page={page} progress={p} />
          ))}
        </div>

        {/* One real 3D sheet: crumpled into a ball, then unfolded into your front page. */}
        <div className="absolute inset-x-0 bottom-[16vh] top-[14vh] z-20">
          <PaperSheet3D progress={p} name={name} />
        </div>

        <motion.div
          style={{ opacity: ctaOpacity }}
          className={cn("absolute inset-x-0 bottom-[3vh] z-40", ctaActive ? "pointer-events-auto" : "pointer-events-none")}
        >
          <CallToAction name={name} setName={setName} returning={returning} />
        </motion.div>

        <motion.p
          style={{ opacity: hintOpacity }}
          className="absolute inset-x-0 bottom-6 z-40 text-center font-condensed text-xs uppercase tracking-[0.3em] text-paper/60"
        >
          Scroll ↓
        </motion.p>
      </div>
    </section>
  );
}