import "server-only";
import puppeteer, { type Browser } from "puppeteer-core";
import { serverEnv } from "@/lib/config/server-env";

/** Local Chrome in development, bundled Chromium on Vercel. */
export async function launchBrowser(): Promise<Browser> {
  const localPath = serverEnv().CHROME_EXECUTABLE_PATH;
  if (localPath) {
    return puppeteer.launch({ executablePath: localPath, headless: true });
  }
  const chromium = (await import("@sparticuz/chromium")).default;
  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}