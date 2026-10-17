"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import type { Edition } from "../schemas";
import { SIZE, puzzleFor, type Cell } from "../wordSearch";

const keyOf = (cell: Cell) => `${cell.r}-${cell.c}`;

/** Cells on a straight line (horizontal, vertical or diagonal) from a to b, or null. */
function lineBetween(a: Cell, b: Cell): Cell[] | null {
  const dr = b.r - a.r;
  const dc = b.c - a.c;
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  return Array.from({ length: steps + 1 }, (_, i) => ({ r: a.r + sr * i, c: a.c + sc * i }));
}

function cellAt(x: number, y: number): Cell | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const r = el?.dataset.r;
  const c = el?.dataset.c;
  return r !== undefined && c !== undefined ? { r: Number(r), c: Number(c) } : null;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function WordSearch({ edition }: { edition: Edition }) {
  const { grid, placed } = useMemo(() => puzzleFor(edition), [edition]);

  const [found, setFound] = useState<Set<string>>(() => new Set());
  const [start, setStart] = useState<Cell | null>(null);
  const [hover, setHover] = useState<Cell | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const dragging = useRef(false);

  const total = placed.length;
  const solved = total > 0 && found.size === total;

  // Tick the clock while the puzzle is in progress.
  useEffect(() => {
    if (!startedAt || finishedAt || revealed) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [startedAt, finishedAt, revealed]);

  const elapsed = startedAt ? Math.max(0, Math.floor(((finishedAt ?? now) - startedAt) / 1000)) : 0;

  const foundCells = useMemo(() => {
    const keys = new Set<string>();
    for (const p of placed) if (revealed || found.has(p.word)) p.cells.forEach((c) => keys.add(keyOf(c)));
    return keys;
  }, [placed, found, revealed]);

  const selection = start ? (hover ? lineBetween(start, hover) : [start]) : null;
  const selectedKeys = new Set((selection ?? []).map(keyOf));

  function begin() {
    if (!startedAt) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
    }
  }

  function finish(end: Cell) {
    if (!start) return;
    const line = lineBetween(start, end);
    setStart(null);
    setHover(null);
    if (!line || line.length < 2) return;

    const text = line.map((c) => grid[c.r][c.c]).join("");
    const reversed = [...text].reverse().join("");
    const match = placed.find((p) => !found.has(p.word) && (p.word === text || p.word === reversed));
    if (!match) return;

    const next = new Set(found).add(match.word);
    setFound(next);
    if (next.size === total) setFinishedAt(Date.now());
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (revealed || solved) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    begin();
    // Tap mode: a first letter is already chosen, so this tap picks the last letter.
    if (start && !dragging.current) {
      finish(cell);
      return;
    }
    dragging.current = true;
    setStart(cell);
    setHover(cell);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    const cell = cellAt(e.clientX, e.clientY);
    if (cell) setHover(cell);
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    const cell = cellAt(e.clientX, e.clientY);
    // Released on a different letter: that's a drag. Same letter: wait for a second tap.
    if (cell && start && (cell.r !== start.r || cell.c !== start.c)) finish(cell);
  }

  if (total === 0) return null;

  return (
    <section className="mx-auto max-w-6xl bg-paper px-5 py-6 text-ink shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] md:px-10 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b-4 border-double border-ink pb-2">
        <div>
          <p className="font-condensed text-[11px] uppercase tracking-[0.3em] text-ink/70">Puzzle Corner</p>
          <h2 className="font-display text-4xl font-black italic md:text-5xl">Today&apos;s Word Search</h2>
        </div>
        <div className="flex items-center gap-4 font-condensed text-xs uppercase tracking-[0.2em]">
          <span>
            Found {found.size}/{total}
          </span>
          <span aria-live="polite">{clock(elapsed)}</span>
          {!solved && !revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="border border-ink/40 px-2 py-1 hover:bg-ink hover:text-paper"
            >
              Reveal
            </button>
          )}
        </div>
      </header>

      <p className="mt-3 font-serif text-sm italic text-ink/75">
        Every word is hidden in this morning&apos;s headlines. Drag across the letters, or tap the first and last letter.
        Words run in all eight directions.
      </p>

      <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
        <div
          role="grid"
          aria-label="Word search grid"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => {
            if (dragging.current) {
              dragging.current = false;
              setStart(null);
              setHover(null);
            }
          }}
          className="grid w-[min(100%,520px)] touch-none select-none border-2 border-ink"
          style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }}
        >
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const key = `${r}-${c}`;
              const isFound = foundCells.has(key);
              const isSelected = selectedKeys.has(key);
              return (
                <div
                  key={key}
                  data-r={r}
                  data-c={c}
                  className={cn(
                    "flex aspect-square cursor-pointer items-center justify-center border border-ink/10 font-display text-[clamp(13px,3.2vw,22px)] font-bold transition-colors",
                    isFound ? "bg-ink text-paper" : isSelected ? "bg-amber-300/80" : "hover:bg-ink/5",
                  )}
                >
                  {letter}
                </div>
              );
            }),
          )}
        </div>

        <div>
          <p className="border-b-2 border-ink pb-1 font-condensed text-xs uppercase tracking-[0.25em]">Find these words</p>
          <ul className="mt-3 columns-2 gap-6 font-display text-lg md:text-xl">
            {placed.map((p) => (
              <li
                key={p.word}
                className={cn(
                  "mb-2 break-inside-avoid tracking-wide",
                  found.has(p.word) || revealed ? "text-ink/40 line-through" : "",
                )}
              >
                {p.word}
              </li>
            ))}
          </ul>

          {solved && (
            <p className="mt-6 border-2 border-ink p-4 font-display text-xl italic">
              Solved in {clock(elapsed)}. You clearly read today&apos;s paper.
            </p>
          )}
          {revealed && !solved && (
            <p className="mt-6 font-serif text-sm italic text-ink/70">
              All words revealed. Come back tomorrow for a new puzzle.
            </p>
          )}
        </div>
      </div>

      <p className="mt-8 border-t border-ink pt-2 text-center font-condensed text-[10px] uppercase tracking-[0.3em] text-ink/60">
        The Morning Paper · Puzzle Corner
      </p>
    </section>
  );
}
