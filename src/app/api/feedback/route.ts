import { NextResponse } from "next/server";
import { HttpError, route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { recordFeedback } from "@/server/domain/learning";
import { feedbackInputSchema } from "@/features/edition/schemas";

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body: unknown = await request.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON");
  });
  const input = feedbackInputSchema.parse(body);
  return NextResponse.json(await recordFeedback(userId, input));
});