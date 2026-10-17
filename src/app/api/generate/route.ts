import { NextResponse } from "next/server";
import { route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { generateEdition } from "@/server/domain/generate";

export const maxDuration = 60;

export const POST = route(async () => {
  const userId = await requireUserId();
  const edition = await generateEdition(userId);
  return NextResponse.json({ edition });
});