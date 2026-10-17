# The Morning Paper

**One personal newspaper, every morning.** The Morning Paper learns what you care about, gathers the day's news from across the web, and prints it as a real newspaper: on the web, as a downloadable PDF, and in an archive of every past edition. It even ends with a puzzle made from the day's headlines.

[![CI](https://github.com/PixelWithMaha/Nascon-26-Personal-Newspaper/actions/workflows/ci.yml/badge.svg)](https://github.com/PixelWithMaha/Nascon-26-Personal-Newspaper/actions/workflows/ci.yml)

- **Live app:** https://YOUR-APP.vercel.app
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Demo video:** _add Loom link_

![Architecture](docs/architecture.png)

---

## The problem

News is scattered across dozens of sites, apps and newsletters. People jump from link to link and still can't name three things they learned. Social media has one feed; the news has nothing like it.

## What it does

| Requirement | How we meet it |
| --- | --- |
| **1. Onboarding** | A 4-step, under-2-minute flow: your name for the masthead, topics, how much of each, and optional keywords, blocked words, sources and reading time. Your first edition prints automatically at the end. |
| **2. Daily PDF** | Every edition renders as an A4 newspaper PDF: blackletter masthead, lead story with photo and drop cap, editor's note, briefs, a 3-column "More news" grid with photos, and a printed **Puzzle Corner**. A daily cron prints every reader's paper (and its PDF) at 05:45 PKT. |
| **3. Webpage** | A full newspaper reading experience: a front page, section pages, photos with credits, "Read the original" links, per-story feedback, PDF download, and a 3D archive to leaf through past editions. |
| **4. Learning** | Every like, "less like this", skip, click and 30-second read is recorded. Topic weights adjust, and Gemini writes a **plain-English profile** ("You're into EV range news… You'd rather skip BMW motorsport") with the stories that taught it. Readers can confirm or correct each learned theme in one click. |

### Puzzle Corner

Every edition ends with a **word search built from that day's headlines**, playable on the web (drag or tap, with a timer) and printed in the PDF. It's the same puzzle in both, made with no AI call. It turns skimming into remembering, which answers the brief's "can't name three things they learned".

**Also in the app:** a scroll-driven landing page where scattered web pages crumple into one 3D paper ball that unfolds into your front page, and real photos credited to their source (article images, or a Wikimedia Commons image of the story's subject).

## How it works

```
RSS + Google News  →  Ingest  →  Enrich (og:image)  →  Gemini curation  →  Wikimedia photos  →  Supabase  →  Web + PDF (+ puzzle)
                                                            ↑
                                       learned profile + topic weights (from your feedback)
```

1. **Ingest:** curated feeds, a Google News search per topic and keyword, and the reader's own sources. Keep the last 36 hours, drop blocked words, de-duplicate.
2. **Enrich:** read each article's own preview image and description where reachable.
3. **Curate:** one Gemini call with structured output picks the stories, writes headlines, summaries and "why you're seeing this", chooses the lead and sections, and names each story's photographable subject.
4. **Illustrate:** stories without an article photo get a credited image of their subject from Wikimedia Commons.
5. **Save and render:** the edition is stored once as JSON in Supabase. The web page and the PDF both render from it, and both build the same word search from its headlines.

### Guardrails against hallucination

- Gemini only selects from article **ids we send**; unknown ids are dropped.
- **Links, sources, dates and photos never come from the model.** They're joined back from our own data, or looked up from real sources.
- Summaries are written only from the article's title and snippet; the prompt forbids adding facts.
- Every boundary is validated with **Zod**, including Gemini's output. Invalid output is retried once, then the edition is marked failed.
- If the AI quota runs out, readers get a clear message, and nothing is retried pointlessly.

## Tech stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| AI | Google Gemini via `@google/genai`, structured JSON output (model set by `GEMINI_MODEL`) |
| News | `rss-parser`: curated feeds, Google News RSS search, reader sources; `og:image` enrichment |
| Photos | Article images, then Wikimedia Commons (credited) |
| Data | Supabase: Postgres with Row Level Security, anonymous auth, Storage for PDFs |
| PDF | `puppeteer-core` + `@sparticuz/chromium` (serverless headless Chrome) |
| Motion | `motion` (scroll animations), `three` + `@react-three/fiber` (3D paper) |
| Quality | Zod at every boundary, Vitest, ESLint, GitHub Actions CI, Vercel CD and Cron |

## Getting started

**Prerequisites:** Node 24, a Supabase project, a Gemini API key, and Google Chrome (for local PDF rendering).

```bash
git clone https://github.com/PixelWithMaha/Nascon-26-Personal-Newspaper.git
cd Nascon-26-Personal-Newspaper
npm install
cp .env.example .env.local   # then fill in the values below
```

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key (browser + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: writing editions and PDFs, the daily cron |
| `GEMINI_API_KEY` | Server only |
| `GEMINI_MODEL` | Optional, defaults to `gemini-3.8-flash` |
| `CRON_SECRET` | Protects `/api/cron/daily` (Vercel sends it automatically) |
| `CHROME_EXECUTABLE_PATH` | **Local only**, e.g. `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` |

**Database:** run the SQL files in `supabase/migrations/` in order in the Supabase SQL Editor, and enable **Authentication → Anonymous sign-ins**.

```bash
npm run dev       # http://localhost:3000
npm run verify    # typecheck + lint + tests
npm run build
```

**Seed past editions (dev only):** with the app open, run in the browser console
`fetch("/api/dev/backfill?days=6", { method: "POST" })`. It prints real editions for the past 6 days, and is disabled in production.

**After changing the PDF layout:** cached PDFs live in Storage, so run `update editions set pdf_path = null;` to re-render them.

## Project structure

```
src/
  app/                    Thin routes and pages; API routes under app/api
  features/<feature>/     UI features: onboarding, edition, interests, archive, landing
    schemas.ts            Zod contract shared by forms, requests and types
    api.ts / hooks.ts     Client data path
    components/
  features/edition/wordSearch.ts
                          Puzzle logic shared by the web page and the PDF
  server/
    domain/               Business logic: ingest, enrich, curate, illustrate, generate,
                          learning, editions, archive, pdf, cron
    integrations/         The only code that talks to the outside world:
                          gemini, supabase, rss, og, wikimedia, browser
  lib/                    API client, typed errors, validated env config
supabase/migrations/      Database schema (versioned)
docs/                     Architecture
```

## Testing and CI/CD

- **Unit tests (Vitest):** schemas, ingestion (freshness, de-duplication, blocklist), curation guardrails (unknown ids dropped, URLs from our data, exactly one lead), learning (weights, profile evidence, corrections), archive, PDF escaping, cron scheduling.
- **CI:** GitHub Actions runs typecheck, lint, tests and build on every push and pull request.
- **CD:** Vercel deploys every push to `main`; Vercel Cron runs the daily edition job.

## Known limitations

- Many Google News links are redirect pages, so their article photos can't be read; those stories get a credited Wikimedia image or a newsprint placeholder.
- Gemini's free tier allows a limited number of requests per day; production use needs a paid key.
- Readers are anonymous (per browser). Accounts and cross-device sync are a natural next step.

## What's next

A crossword from the day's stories, a listen-to-your-paper audio briefing, an "explore more" prompt that suggests new interests, and a weekly "what you learned" recap.
