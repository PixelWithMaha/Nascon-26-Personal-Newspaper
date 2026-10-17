import "server-only";
import type { Edition, Story } from "@/features/edition/schemas";
import { issueNumber, longDate } from "@/features/edition/format";
import { puzzleFor } from "@/features/edition/wordSearch";
import { launchBrowser } from "@/server/integrations/browser";
import { getSupabaseAdmin } from "@/server/integrations/supabase";
import { HttpError } from "@/server/http";
import { getEditionRecord, setPdfPath } from "./editions";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
const href = (url: string) => (/^https?:\/\//i.test(url) ? esc(url) : "#");

const FONTS =
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=UnifrakturMaguntia&display=swap";

const CSS = `
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; color: #17140f; background: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 9.4pt; line-height: 1.38; }
a { color: inherit; }
p { margin: 0 0 4px; }
.dateline { display: flex; justify-content: space-between; border-top: 1px solid; border-bottom: 1px solid; padding: 3px 0; font-family: Oswald, sans-serif; font-size: 7pt; letter-spacing: .2em; text-transform: uppercase; }
.nameplate { text-align: center; font-family: 'UnifrakturMaguntia', serif; font-size: 54pt; line-height: 1; margin: 8px 0 2px; }
.tagline { text-align: center; font-family: 'Playfair Display', serif; font-style: italic; font-size: 10.5pt; }
.double { border-top: 4px double #17140f; margin: 8px 0 12px; }
.kicker { display: inline-block; font-family: Oswald, sans-serif; font-size: 6.5pt; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; border-bottom: 1px solid; margin-bottom: 3px; }
.kicker.inverse { background: #17140f; color: #fff; padding: 2px 6px; border: 0; }
.meta { font-family: Oswald, sans-serif; font-size: 6.5pt; letter-spacing: .15em; text-transform: uppercase; color: #4a453c; margin-top: 3px; }
.why { font-size: 7.5pt; font-style: italic; color: #4a453c; border-left: 2px solid rgba(23,20,15,.4); padding-left: 4px; margin-top: 3px; }
.credit { font-size: 6.5pt; font-style: italic; color: #6a645a; margin: 2px 0 4px; }
.dek { font-family: 'Playfair Display', serif; font-style: italic; color: #3a352c; margin: 2px 0 4px; }
img { display: block; width: 100%; object-fit: cover; filter: grayscale(1) contrast(1.15); border: 1px solid rgba(23,20,15,.3); }

/* Front page: lead on the left, editor + briefs on the right. */
.front { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.lead h2 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 28pt; line-height: 1.02; margin: 6px 0 4px; }
.lead .dek { font-size: 11pt; }
.lead img { height: 80mm; margin-top: 6px; }
.lead .body { columns: 2; column-gap: 14px; column-rule: 1px solid rgba(23,20,15,.3); font-size: 10pt; margin-top: 6px; }
.lead .body p::first-letter { float: left; font-family: 'Playfair Display', serif; font-weight: 900; font-size: 38pt; line-height: .8; margin: 4px 6px 0 0; }
.side { border-left: 1px solid #17140f; padding-left: 12px; }
.editor { border: 1.5px solid #17140f; padding: 8px 10px; }
.label { font-family: Oswald, sans-serif; font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; margin: 0 0 4px; }
.editor p.note { font-style: italic; margin: 0; }
.index { margin-top: 10px; }
.index .label, .briefs .label { border-bottom: 2px solid; padding-bottom: 2px; }
.index ol { list-style: none; padding: 0; margin: 0; }
.index li { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(23,20,15,.2); padding: 2px 0; font-family: 'Playfair Display', serif; font-size: 10.5pt; }
.briefs { margin-top: 10px; }
.briefs ul { list-style: none; padding: 0; margin: 0; }
.briefs li { border-bottom: 1px dotted rgba(23,20,15,.4); padding: 5px 0; break-inside: avoid; }
.briefs li strong { font-weight: 600; }

/* More news: a 3-across grid, filled row by row; whole rows move to the next page. */
.more-head { text-align: center; border-top: 4px double #17140f; border-bottom: 4px double #17140f; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 11pt; letter-spacing: .35em; padding: 3px 0; margin: 12px 0 8px; break-after: avoid; page-break-after: avoid; }
.flow { display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 14px; row-gap: 8px; align-items: start; }
.item { break-inside: avoid; page-break-inside: avoid; padding: 0 0 6px; border-bottom: 1px solid rgba(23,20,15,.25); font-size: 8.8pt; line-height: 1.34; }
.item h4 { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 11pt; line-height: 1.12; margin: 2px 0 3px; }
.item.feature h4 { font-size: 12.5pt; }
.item img { height: 34mm; margin-bottom: 2px; }
.item.brief h4 { font-family: 'Source Serif 4', Georgia, serif; font-size: 9pt; font-weight: 600; }

/* Puzzle corner: the same word search as the web page, kept together on one page. */
.puzzle { break-inside: avoid; page-break-inside: avoid; margin-top: 14px; }
.puzzle-body { display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: start; }
.ws { border-collapse: collapse; border: 2px solid #17140f; }
.ws td { width: 7.5mm; height: 7.5mm; padding: 0; text-align: center; vertical-align: middle; font-family: 'Playfair Display', serif; font-weight: 700; font-size: 11pt; border: 1px solid rgba(23,20,15,.15); }
.ws-words { columns: 2; column-gap: 16px; list-style: none; padding: 0; margin: 6px 0 0; font-family: 'Playfair Display', serif; font-size: 11.5pt; letter-spacing: .06em; }
.ws-words li { padding: 3px 0; border-bottom: 1px dotted rgba(23,20,15,.3); break-inside: avoid; }
.ws-note { font-style: italic; font-size: 8pt; color: #4a453c; margin-top: 8px; }
`;

const photo = (s: Story) =>
  s.imageUrl && /^https?:\/\//i.test(s.imageUrl)
    ? `<img src="${esc(s.imageUrl)}" alt="" />${s.imageCredit ? `<p class="credit">${esc(s.imageCredit)}</p>` : ""}`
    : "";

const meta = (s: Story) => `<p class="meta">${esc(s.sourceName)} · <a href="${href(s.url)}">Read the original</a></p>`;
const why = (s: Story) => (s.why ? `<p class="why">${esc(s.why)}</p>` : "");

function itemHtml(s: Story, section: string): string {
  if (s.size === "brief") {
    return `<div class="item brief"><span class="kicker">${esc(section)}</span><h4><a href="${href(s.url)}">${esc(s.headline)}</a></h4><p>${esc(s.summary)}</p>${meta(s)}</div>`;
  }
  const dek = s.size === "feature" && s.dek ? `<p class="dek">${esc(s.dek)}</p>` : "";
  return `<div class="item ${s.size}">${photo(s)}<span class="kicker">${esc(section)}</span><h4>${esc(s.headline)}</h4>${dek}<p>${esc(s.summary)}</p>${meta(s)}${why(s)}</div>`;
}

/** The printed word search: same grid and words as the web page. */
function puzzleHtml(edition: Edition): string {
  const { grid, placed } = puzzleFor(edition);
  if (placed.length === 0) return "";
  const rows = grid.map((row) => `<tr>${row.map((letter) => `<td>${esc(letter)}</td>`).join("")}</tr>`).join("");
  const words = placed.map((p) => `<li>${esc(p.word)}</li>`).join("");
  return `<div class="puzzle">
  <div class="more-head">PUZZLE CORNER · WORD SEARCH</div>
  <div class="puzzle-body">
    <table class="ws">${rows}</table>
    <div>
      <p class="label">Find these words</p>
      <ul class="ws-words">${words}</ul>
      <p class="ws-note">Every word is hidden in today's headlines. Words run in all eight directions: across, down, diagonally and backwards.</p>
    </div>
  </div>
</div>`;
}

/** Pure: the print layout as a self-contained HTML document. */
export function renderEditionHtml(edition: Edition): string {
  const sectionOf = new Map<string, string>();
  edition.sections.forEach((sec) => sec.stories.forEach((st) => sectionOf.set(st.id, sec.name)));

  const all = edition.sections.flatMap((s) => s.stories);
  const lead = all.find((s) => s.id === edition.leadStoryId) ?? all[0];
  const rest = all.filter((s) => s.id !== lead.id);

  // Right column: up to 4 briefs. Everything else goes in the "More news" grid.
  const latest = rest.filter((s) => s.size === "brief").slice(0, 4);
  const latestIds = new Set(latest.map((s) => s.id));
  const flow = [
    ...rest.filter((s) => s.size !== "brief"),
    ...rest.filter((s) => s.size === "brief" && !latestIds.has(s.id)),
  ];

  const briefsHtml = latest.length
    ? `<div class="briefs"><p class="label">Latest briefs</p><ul>${latest
        .map(
          (s) =>
            `<li><a href="${href(s.url)}"><strong>${esc(s.headline)}.</strong></a> ${esc(s.summary)} <span class="meta">${esc(s.sourceName)}</span></li>`,
        )
        .join("")}</ul></div>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>The Morning Paper · ${esc(edition.editionDate)}</title>
<link rel="stylesheet" href="${FONTS}" />
<style>${CSS}</style></head>
<body>
  <div class="dateline">
    <span>Vol. I · No. ${issueNumber(edition.editionDate)}</span>
    <span>Personal edition for ${esc(edition.masthead.readerName)}</span>
    <span>${esc(longDate(edition.editionDate))}</span>
  </div>
  <div class="nameplate">${esc(edition.masthead.title)}</div>
  <p class="tagline">“${esc(edition.masthead.tagline)}”</p>
  <div class="double"></div>

  <div class="front">
    <div class="lead">
      <span class="kicker inverse">${esc(lead.topic)} · Today's lead</span>
      <h2>${esc(lead.headline)}</h2>
      ${lead.dek ? `<p class="dek">${esc(lead.dek)}</p>` : ""}
      ${photo(lead)}
      <div class="body"><p>${esc(lead.summary)}</p></div>
      ${meta(lead)}
      ${why(lead)}
    </div>
    <div class="side">
      <div class="editor"><p class="label">From the Editor</p><p class="note">${esc(edition.editorNote)}</p></div>
      <div class="index"><p class="label">Inside Today</p><ol>
        ${edition.sections.map((s) => `<li><span>${esc(s.name)}</span><span>${s.stories.length}</span></li>`).join("")}
      </ol></div>
      ${briefsHtml}
    </div>
  </div>

  ${
    flow.length
      ? `<div class="more-head">MORE NEWS</div><div class="flow">${flow
          .map((s) => itemHtml(s, sectionOf.get(s.id) ?? s.topic))
          .join("")}</div>`
      : ""
  }

  ${puzzleHtml(edition)}
</body></html>`;
}

export async function renderEditionPdf(edition: Edition): Promise<Uint8Array> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(renderEditionHtml(edition), { waitUntil: "load", timeout: 20_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "16mm", left: "11mm", right: "11mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;text-align:center;font-family:Georgia,serif;font-size:7px;color:#555;">
        The Morning Paper · ${esc(longDate(edition.editionDate))} · Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`,
    });
  } finally {
    await browser.close();
  }
}

/** Returns the cached PDF, or renders, caches and returns it. */
export async function getEditionPdf(editionId: string): Promise<{ bytes: Uint8Array; filename: string }> {
  const record = await getEditionRecord(editionId);
  if (!record) throw new HttpError(404, "Edition not found");

  const filename = `morning-paper-${record.edition.editionDate}.pdf`;
  const storage = getSupabaseAdmin().storage.from("papers");

  if (record.pdfPath) {
    const { data, error } = await storage.download(record.pdfPath);
    if (!error && data) return { bytes: new Uint8Array(await data.arrayBuffer()), filename };
    console.warn("[pdf] cached file missing, re-rendering", error?.message);
  }

  const bytes = await renderEditionPdf(record.edition);
  const path = `${record.userId}/${record.edition.editionDate}.pdf`;
  const { error } = await storage.upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) console.warn("[pdf] caching failed", error.message);
  else await setPdfPath(record.id, path);

  return { bytes, filename };
}
