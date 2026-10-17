import { NextResponse } from "next/server";
import { HttpError, route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { applyLearnedAction } from "@/server/domain/interests";
import { learnedActionSchema } from "@/features/interests/schemas";

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body: unknown = await request.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON");
  });
  return NextResponse.json(await applyLearnedAction(userId, learnedActionSchema.parse(body)));
});