import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { HttpError, route } from "@/server/http";
import { serverEnv } from "@/lib/config/server-env";
import { runDailyEditions } from "@/server/domain/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Called by Vercel Cron, which sends "Authorization: Bearer <CRON_SECRET>". */
export const GET = route(async (request: Request) => {
  const authorization = request.headers.get("authorization") ?? "";
  if (!safeEqual(authorization, `Bearer ${serverEnv().CRON_SECRET}`)) {
    throw new HttpError(401, "Unauthorized");
  }
  return NextResponse.json(await runDailyEditions());
});