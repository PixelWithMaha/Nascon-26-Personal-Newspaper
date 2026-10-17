"use client";
import { SiteLogo } from "@/components/SiteLogo";
import Link from "next/link";
import { motion } from "motion/react";
import { CrumpleHero } from "./CrumpleHero";

const STEPS = [
  { n: "I", title: "Tell us what you care about", body: "Pick your topics, set your reading time, add sources you trust. Under two minutes." },
  { n: "II", title: "We read the web before you wake", body: "Real articles from across the web, curated and summarised by Gemini. Every story links to its original." },
  { n: "III", title: "It learns, in plain English", body: "Like, skip, or ask for less. See exactly what we've learned about you, and correct us in one click." },
  { n: "IV", title: "A newspaper, every morning", body: "Read it on the web, download it as a PDF, and leaf back through every past edition." },
];

export function LandingPage({ returning }: { returning: boolean }) {
  return (
    <div data-theme="landing" className="bg-[radial-gradient(ellipse_at_top,#2b251c_0%,#0d0b08_60%)] text-paper">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4">
        <SiteLogo tone="dark" />
        <Link
          href={returning ? "/paper" : "/onboarding"}
          className="font-condensed text-xs uppercase tracking-[0.25em] text-paper/80 underline-offset-4 hover:underline"
        >
          {returning ? "Today's paper →" : "Get started →"}
        </Link>
      </header>

      <CrumpleHero returning={returning} />

      <section className="mx-auto max-w-5xl px-5 py-24">
        <h2 className="text-center font-blackletter text-4xl md:text-6xl">How it works</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="border-t border-paper/30 pt-4"
            >
              <p className="font-condensed text-xs uppercase tracking-[0.3em] text-paper/60">{step.n}</p>
              <h3 className="mt-2 font-display text-2xl font-bold italic">{step.title}</h3>
              <p className="mt-2 font-serif text-paper/80">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t-4 border-double border-paper/40 px-5 py-16 text-center">
        <p className="font-display text-2xl italic">One morning. One paper. Yours.</p>
        <Link
          href={returning ? "/paper" : "/onboarding"}
          className="mt-6 inline-block bg-paper px-6 py-3 font-condensed text-sm uppercase tracking-[0.2em] text-ink hover:bg-paper/90"
        >
          {returning ? "Open today's paper" : "Print my first edition"}
        </Link>
      </footer>
    </div>
  );
}