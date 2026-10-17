# CLAUDE.md

Guidance for AI coding assistants (and humans) working in this repo.

## Commands

- `npm run dev`: dev server at http://localhost:3000. Run **only one** instance.
- `npm run verify`: typecheck, lint, tests. Must pass before every commit.
- `npm run build`: production build.

## Architecture rules

1. **Routes stay thin.** `src/app/**` validates input with Zod and delegates to `src/server/domain`. No business logic in routes or pages.
2. **Outside calls only in `src/server/integrations`** (gemini, supabase, rss, og, wikimedia, browser). Domain code never calls `fetch` to third parties directly.
3. **Validate every boundary with Zod:** forms, requests, responses, stored editions and model output. Schemas live in `src/features/<feature>/schemas.ts`.
4. **The model never produces URLs, sources, dates or images.** Gemini returns article ids and text; everything else is joined back from our own data.
5. **Database access goes through `db()`** in domain code. It is the reader's session (RLS) normally, and the admin client inside `runAsSystem()` (cron). Always filter by `user_id` explicitly.
6. **Secrets stay server-side.** Only `NEXT_PUBLIC_*` variables reach the browser. Env is validated in `src/lib/config`.
7. **The browser calls only our API**, through `src/lib/api/client.ts` (`apiRequest`, `apiDownload`).

## Adding a feature

1. `src/features/<name>/schemas.ts`: the contract.
2. `src/server/domain/<name>.ts`: logic, plus a `*.test.ts` for pure functions.
3. `src/app/api/<name>/route.ts`: thin route using `route()` from `src/server/http.ts`.
4. `src/features/<name>/api.ts` and `hooks.ts`, then components.

## Gotchas

- Files that import `server-only` are testable because Vitest aliases it to an empty module.
- `react-hooks` compiler rules forbid mutating values created during render. For three.js objects, create them in an effect and keep them in refs.
- Motion scroll ranges must stay within 0 to 1.
- Gemini free tier is about 20 requests per day per model. The backfill uses 2 per day printed.
- PDFs are cached in Storage. After changing the PDF layout, run `update editions set pdf_path = null;`.
