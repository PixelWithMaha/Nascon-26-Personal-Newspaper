import { SAMPLE_EDITION } from "./constants";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function halftone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.fillStyle = "#e4ddcd";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#17140f";
  const step = 9;
  for (let py = 0; py < h; py += step) {
    for (let px = 0; px < w; px += step) {
      const tone = 0.5 + 0.5 * Math.sin((px / w) * 4 + (py / h) * 2.5) * Math.cos((py / h) * 3 - px / w);
      const r = (step / 2) * (0.15 + 0.8 * tone * (0.4 + 0.6 * (py / h)));
      ctx.beginPath();
      ctx.arc(x + px + step / 2, y + py + step / 2, Math.max(r, 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#17140f";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export async function drawFrontPage(canvas: HTMLCanvasElement, name: string): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const pad = 72;
  const inner = W - pad * 2;
  const ink = "#17140f";
  const paper = "#f4efe3";

  const css = getComputedStyle(document.documentElement);
  const family = (variable: string, fallback: string) => css.getPropertyValue(variable).trim() || fallback;
  const black = family("--font-blackletter", "serif");
  const display = family("--font-display", "Georgia, serif");
  const serif = family("--font-serif", "Georgia, serif");
  const cond = family("--font-condensed", "'Arial Narrow', sans-serif");
  await Promise.all(
    [`120px ${black}`, `900 64px ${display}`, `italic 30px ${display}`, `28px ${serif}`, `600 22px ${cond}`].map((f) =>
      document.fonts.load(f).catch(() => undefined),
    ),
  );

  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  let s = 11;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = `rgba(60,50,30,${(rnd() * 0.08).toFixed(3)})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.5, 1.5);
  }

  ctx.fillStyle = ink;
  const rule = (y: number, h = 2) => ctx.fillRect(pad, y, inner, h);

  rule(70);
  rule(118);
  ctx.font = `600 22px ${cond}`;
  ctx.textAlign = "left";
  ctx.fillText(`PERSONAL EDITION FOR ${(name.trim() || "you").toUpperCase()}`, pad, 103);
  ctx.textAlign = "right";
  ctx.fillText(
    new Date()
      .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      .toUpperCase(),
    W - pad,
    103,
  );

  ctx.textAlign = "center";
  let size = 120;
  ctx.font = `${size}px ${black}`;
  while (ctx.measureText("The Morning Paper").width > inner && size > 60) {
    size -= 4;
    ctx.font = `${size}px ${black}`;
  }
  ctx.fillText("The Morning Paper", W / 2, 250);
  ctx.font = `italic 30px ${display}`;
  ctx.fillText(`“${SAMPLE_EDITION.tagline}”`, W / 2, 302);
  rule(330, 4);
  rule(338, 2);

  ctx.textAlign = "left";
  ctx.font = `600 22px ${cond}`;
  const kicker = `${SAMPLE_EDITION.leadTopic.toUpperCase()} · SAMPLE EDITION`;
  ctx.fillRect(pad, 370, ctx.measureText(kicker).width + 24, 36);
  ctx.fillStyle = paper;
  ctx.fillText(kicker, pad + 12, 396);
  ctx.fillStyle = ink;

  let y = 480;
  ctx.font = `900 64px ${display}`;
  for (const line of wrap(ctx, SAMPLE_EDITION.leadHeadline, inner)) {
    ctx.fillText(line, pad, y);
    y += 70;
  }
  ctx.font = `italic 30px ${display}`;
  ctx.fillStyle = "#4a443a";
  for (const line of wrap(ctx, SAMPLE_EDITION.leadDek, inner)) {
    ctx.fillText(line, pad, y);
    y += 38;
  }
  ctx.fillStyle = ink;

  y += 18;
  const photoH = 250;
  const colW = (inner - 30) / 2;
  halftone(ctx, pad, y, colW, photoH);
  ctx.fillStyle = "rgba(23,20,15,0.6)";
  for (let row = 0; row < 11; row++) {
    const lineW = row === 10 ? colW * 0.6 : colW * (0.88 + rnd() * 0.12);
    ctx.fillRect(pad + colW + 30, y + 8 + row * 22, lineW, 7);
  }
  ctx.fillStyle = ink;
  y += photoH + 30;

  rule(y);
  y += 44;
  const sectionW = (inner - 60) / 3;
  SAMPLE_EDITION.sections.forEach((section, i) => {
    const x = pad + i * (sectionW + 30);
    ctx.font = `600 22px ${cond}`;
    ctx.fillText(section.name.toUpperCase(), x, y);
    ctx.font = `28px ${serif}`;
    let yy = y + 40;
    for (const line of wrap(ctx, section.headline, sectionW)) {
      ctx.fillText(line, x, yy);
      yy += 34;
    }
  });
}
