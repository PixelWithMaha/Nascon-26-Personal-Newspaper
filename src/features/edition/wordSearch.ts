import type { Edition } from "./schemas";

/** Shared word-search logic, used by the web page and the PDF so both show the same puzzle. */

export const SIZE = 12;
const MAX_WORDS = 10;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// Common words that make poor puzzle answers.
const STOP = new Set([
  "ABOUT", "AFTER", "AHEAD", "AGAIN", "AMID", "BEEN", "BEFORE", "BEING", "BOTH", "COULD", "DOES", "DOWN", "EACH",
  "FROM", "GETS", "HAVE", "INTO", "JUST", "LIKE", "MAKE", "MAKES", "MORE", "MOST", "MUCH", "NEAR", "NEXT", "ONLY",
  "OVER", "SAYS", "SOME", "SUCH", "TAKE", "TAKES", "THAN", "THAT", "THEIR", "THEM", "THEN", "THERE", "THESE",
  "THEY", "THIS", "THOSE", "UNDER", "UPON", "VERY", "WANT", "WANTS", "WHAT", "WHEN", "WHERE", "WHICH",
  "WHILE", "WILL", "WITH", "WOULD", "YOUR", "NEWS", "FIRST", "LAST", "AMONG", "AMONGST", "ALSO",
]);

export type Cell = { r: number; c: number };
export type Placed = { word: string; cells: Cell[] };

const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [-1, 1],
  [0, -1],
  [-1, 0],
  [-1, -1],
  [1, -1],
];

/** Deterministic random numbers from a text seed, so each edition always gets the same puzzle. */
function seeded(seedText: string) {
  let h = 2166136261;
  for (const ch of seedText) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Picks the most frequent meaningful words from today's headlines (4–9 letters). */
export function pickWords(edition: Edition): string[] {
  const counts = new Map<string, number>();
  const headlines = edition.sections.flatMap((s) => s.stories.map((st) => st.headline));
  for (const headline of headlines) {
    for (const raw of headline.split(/[^A-Za-z]+/)) {
      const word = raw.toUpperCase();
      if (word.length < 4 || word.length > 9 || STOP.has(word)) continue;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([word]) => word);

  // Short section names make good fillers if headlines are thin.
  for (const section of edition.sections) {
    const name = section.name.toUpperCase().replace(/[^A-Z]/g, "");
    if (name.length >= 4 && name.length <= 10 && !ranked.includes(name)) ranked.push(name);
  }
  return ranked.slice(0, MAX_WORDS);
}

/** Hides the words in all 8 directions (overlaps allowed when letters match), then fills the rest. */
export function buildPuzzle(words: string[], seedText: string): { grid: string[][]; placed: Placed[] } {
  const rand = seeded(seedText);
  const grid: string[][] = Array.from({ length: SIZE }, () => Array<string>(SIZE).fill(""));
  const placed: Placed[] = [];

  for (const word of [...words].sort((a, b) => b.length - a.length)) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const [dr, dc] = DIRECTIONS[Math.floor(rand() * DIRECTIONS.length)];
      const r0 = Math.floor(rand() * SIZE);
      const c0 = Math.floor(rand() * SIZE);
      const rEnd = r0 + dr * (word.length - 1);
      const cEnd = c0 + dc * (word.length - 1);
      if (rEnd < 0 || rEnd >= SIZE || cEnd < 0 || cEnd >= SIZE) continue;

      const cells: Cell[] = [];
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        const current = grid[r][c];
        if (current && current !== word[i]) {
          fits = false;
          break;
        }
        cells.push({ r, c });
      }
      if (!fits) continue;

      cells.forEach((cell, i) => {
        grid[cell.r][cell.c] = word[i];
      });
      placed.push({ word, cells });
      break;
    }
  }

  for (const row of grid) {
    for (let c = 0; c < SIZE; c++) {
      if (!row[c]) row[c] = LETTERS[Math.floor(rand() * LETTERS.length)];
    }
  }
  return { grid, placed };
}

/** Builds the puzzle for one edition. */
export function puzzleFor(edition: Edition) {
  return buildPuzzle(pickWords(edition), edition.editionDate);
}
