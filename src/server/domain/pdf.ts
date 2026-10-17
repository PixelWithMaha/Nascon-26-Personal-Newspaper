import "server-only";
import type { Edition, Story } from "@/features/edition/schemas";
import { issueNumber, longDate } from "@/features/edition/format";
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
body { margin: 0; color: #17140f; background: #fff; font-family: 'Source Serif 4', Georgia, serif; font-size: 9.6pt; line-height: 1.38; }
a { color: inherit; }
.dateline { display: flex; justify-content: space-between; border-top: 1px solid; border-bottom: 1px solid; padding: 3px 0; font-family: Oswald, sans-serif; font-size: 7pt; letter-spacing: .2em; text-transform: uppercase; }
.nameplate { text-align: center; font-family: 'UnifrakturMaguntia', serif; font-size: 56pt; line-height: 1; margin: 10px 0 2px; }
.tagline { text-align: center; font-family: 'Playfair Display', serif; font-style: italic; font-size: 11pt; margin: 0; }
.double { border-top: 4px double #17140f; margin: 8px 0 12px; }
.kicker { display: inline-block; font-family: Oswald, sans-serif; font-size: 6.5pt; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; border-bottom: 1px solid; }
.kicker.inverse { background: #17140f; color: #fff; padding: 2px 6px; border: 0; }
.front { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.lead h2 { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 30pt; line-height: 1.02; letter-spacing: -.01em; margin: 6px 0; }
.lead .dek { font-size: 12pt; }
.lead .body { columns: 2; column-gap: 14px; column-rule: 1px solid rgba(23,20,15,.3); font-size: 10.5pt; }
.lead .body p::first-letter { float: left; font-family: 'Playfair Display', serif; font-weight: 900; font-size: 42pt; line-height: .8; margin: 4px 6px 0 0; }
.side { border-left: 1px solid #17140f; padding-left: 12px; }
.editor { border: 1.5px solid #17140f; padding: 8px 10px; }
.label { font-family: Oswald, sans-serif; font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; margin: 0 0 4px; }
.editor p.note { font-style: italic; margin: 0; }
.index { margin-top: 12px; }
.index .label { border-bottom: 2px solid; padding-bottom: 2px; }
.index ol { list-style: none; padding: 0; margin: 0; }
.index li { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(23,20,15,.2); padding: 3px 0; font-family: 'Playfair Display', serif; font-size: 11pt; }
.sections { columns: 3; column-gap: 14px; column-rule: 1px solid rgba(23,20,15,.3); margin-top: 14px; }
.section-head { column-span: all; display: flex; align-items: center; gap: 8px; margin: 14px 0 8px; }
.section-head::before, .section-head::after { content: ""; flex: 1; border-top: 1px solid #17140f; }
.section-head h3 { margin: 0; background: #17140f; color: #fff; font-family: 'Playfair Display', serif; font-style: italic; font-size: 14pt; padding: 2px 12px; }
article { break-inside: avoid-column; margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(23,20,15,.25); }
article h4 { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 12.5pt; line-height: 1.12; margin: 4px 0; }
article.feature h4 { font-size: 15pt; }
.dek { font-family: 'Playfair Display', serif; font-style: italic; margin: 2px 0 4px; color: #3a352c; }
p { margin: 0 0 4px; }
.meta { font-family: Oswald, sans-serif; font-size: 6.5pt; letter-spacing: .15em; text-transform: uppercase; color: #4a453c; }
.why { font-size: 7.5pt; font-style: italic; color: #4a453c; border-left: 2px solid rgba(23,20,15,.4); padding-left: 4px; }
img { width: 100%; max-height: 62mm; object-fit: cover; filter: grayscale(1) contrast(1.2); border: 1px solid rgba(23,20,15,.3); margin: 4px 0; }
.briefs { column-span: all; border-top: 4px double #17140f; border-bottom: 4px double #17140f; padding: 6px 0; margin: 6px 0 10px; }
.briefs h5 { text-align: center; font-family: 'Playfair Display', serif; font-size: 11pt; letter-spacing: .4em; margin: 0 0 4px; }
.briefs ul { columns: 2; column-gap: 18px; list-style: none; padding: 0; margin: 0; }
.briefs li { break-inside: avoid; border-bottom: 1px dotted rgba(23,20,15,.4); padding: 4px 0; }
.closing { border-top: 4px double; border-bottom: 4px double; text-align: center; font-family: 'Playfair Display', serif; font-style: italic; padding: 4px 0; margin-top: 14px; break-inside: avoid; }
`;

const photo = (s: Story) =>
  s.imageUrl && /^https?:\/\//i.test(s.imageUrl) ? `<img src="${esc(s.imageUrl)}" alt="" />` : "";

const meta = (s: Story) =>
  `<p class="meta">${esc(s.sourceName)} · <a href="${href(s.url)}">Read the original</a></p>` +
  (s.why ? `<p class="why">${esc(s.why)}</p>` : "");

const storyHtml = (s: Story) => `
<article class="${s.size}">
  <span class="kicker">${esc(s.topic)}</span>
  <h4>${esc(s.headline)}</h4>
  ${s.dek ? `<p class="dek">${esc(s.dek)}</p>` : ""}
  ${s.size === "feature" ? photo(s) : ""}
  <p>${esc(s.summary)}</p>
  ${meta(s)}
</article>`;

const briefsHtml = (stories: Story[]) => `
<div class="briefs"><h5>BRIEFS</h5><ul>
  ${stories
    .map(
      (s) =>
        `<li><a href="${href(s.url)}"><strong>${esc(s.headline)}.</strong></a> ${esc(s.summary)} <span class="meta">${esc(s.sourceName)}</span></li>`,
    )
    .join("")}
</ul></div>`;

/** Pure: the print layout as a self-contained HTML document. */
export function renderEditionHtml(edition: Edition): string {
  const stories = edition.sections.flatMap((s) => s.stories);
  const lead = stories.find((s) => s.id === edition.leadStoryId) ?? stories[0];

  const sections = edition.sections
    .map((section) => {
      const rest = section.stories.filter((s) => s.id !== lead.id);
      if (rest.length === 0) return "";
      const main = rest.filter((s) => s.size !== "brief").map(storyHtml).join("");
      const briefs = rest.filter((s) => s.size === "brief");
      return `<div class="section-head"><h3>${esc(section.name)}</h3></div>${main}${briefs.length ? briefsHtml(briefs) : ""}`;
    })
    .join("");

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
    </div>
    <div class="side">
      <div class="editor"><p class="label">From the Editor</p><p class="note">${esc(edition.editorNote)}</p></div>
      <div class="index"><p class="label">Inside Today</p><ol>
        ${edition.sections.map((s) => `<li><span>${esc(s.name)}</span><span>${s.stories.length}</span></li>`).join("")}
      </ol></div>
    </div>
  </div>

  <div class="sections">${sections}</div>
  <div class="closing">★ Read slowly. Think freely. Come back tomorrow. ★</div>
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