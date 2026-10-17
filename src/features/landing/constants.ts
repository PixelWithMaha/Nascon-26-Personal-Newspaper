export type PageKind = "article" | "newsletter" | "post" | "live" | "tabs";

export type ScatteredPageData = {
  kind: PageKind;
  outlet: string;
  headline: string;
  seed: string;
  clip: string;
  x: number;
  y: number;
  r: number;
  pileX: number;
  pileY: number;
  spin: number;
};

// All publications are invented. No real brands, logos or articles.
const PAGES: { kind: PageKind; outlet: string; headline: string }[] = [
  { kind: "article", outlet: "The Daily Ledger", headline: "Rates hold steady as markets wait for a signal" },
  { kind: "post", outlet: "@bytestreet", headline: "Everyone is talking about small AI models. Here's why." },
  { kind: "live", outlet: "Pitch Report", headline: "Final day: spinners take control" },
  { kind: "newsletter", outlet: "Market Tape", headline: "Five things to know before the open" },
  { kind: "tabs", outlet: "metrowire.example", headline: "Council approves new transit line" },
  { kind: "article", outlet: "Orbit Weekly", headline: "A quieter way to store the sun's energy" },
  { kind: "post", outlet: "@signalnoise", headline: "Thread: what the new chip actually changes" },
  { kind: "article", outlet: "Civic Post", headline: "City markets go cashless, slowly" },
  { kind: "newsletter", outlet: "The Overnight", headline: "While you slept: 12 stories in 3 minutes" },
  { kind: "live", outlet: "Metro Wire", headline: "Storm updates as they happen" },
  { kind: "article", outlet: "Field Notes", headline: "Inside the race for cheaper batteries" },
  { kind: "tabs", outlet: "dailyledger.example", headline: "Opinion: the case for slower news" },
  { kind: "post", outlet: "@pitchside", headline: "That catch. Watch it again." },
  { kind: "article", outlet: "Byte Street", headline: "Phones get smarter, offline" },
  { kind: "newsletter", outlet: "Signal & Noise", headline: "Your weekly AI digest is here" },
  { kind: "article", outlet: "The Ledger Review", headline: "Why every app wants to be a bank" },
];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(7);
const between = (min: number, max: number) => min + rand() * (max - min);

/** A hand-torn outline: torn bottom always, torn top sometimes. */
function tornEdge(tornTop: boolean): string {
  const steps = 22;
  const points: string[] = [];
  if (tornTop) {
    for (let k = 0; k <= steps; k++) points.push(`${((k / steps) * 100).toFixed(1)}% ${(rand() * 3.5).toFixed(1)}%`);
  } else {
    points.push("0% 0%", "100% 0%");
  }
  for (let k = steps; k >= 0; k--) points.push(`${((k / steps) * 100).toFixed(1)}% ${(100 - rand() * 4.5).toFixed(1)}%`);
  return `polygon(${points.join(", ")})`;
}

export const SCATTERED_PAGES: ScatteredPageData[] = PAGES.map((page, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  return {
    ...page,
    seed: `morning-paper-${i}`,
    clip: tornEdge(i % 2 === 0),
    x: -36 + col * 24 + between(-5, 5),
    y: -30 + row * 20 + between(-5, 5),
    r: between(-16, 16),
    pileX: between(-6, 6),
    pileY: between(-5, 5),
    spin: between(-40, 40),
  };
});

export const SAMPLE_EDITION = {
  tagline: "All the news that fits you",
  leadTopic: "Technology",
  leadHeadline: "Small Models, Big Ambitions: AI Moves Onto Your Phone",
  leadDek: "Your sample front page. The real one is built from your interests, every morning.",
  sections: [
    { name: "Cricket", headline: "Spinners turn the final day" },
    { name: "Markets", headline: "Rates hold as markets wait" },
    { name: "Science", headline: "A quieter way to store sunlight" },
  ],
};
