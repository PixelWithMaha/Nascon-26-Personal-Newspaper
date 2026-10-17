import { NextResponse } from "next/server";
import { HttpError, route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { getPreferences, savePreferences } from "@/server/domain/preferences";
import { preferencesSchema } from "@/features/onboarding/schemas";

export const GET = route(async () => {
  const userId = await requireUserId();
  return NextResponse.json({ preferences: await getPreferences(userId) });
});

export const POST = route(async (request: Request) => {
  const userId = await requireUserId();
  const body: unknown = await request.json().catch(() => {
    throw new HttpError(400, "Request body must be JSON");
  });
  const input = preferencesSchema.parse(body);
  return NextResponse.json({ preferences: await savePreferences(userId, input) });
});