import { z } from "zod";
import { route } from "@/server/http";
import { requireUserId } from "@/server/integrations/supabase";
import { getEditionPdf } from "@/server/domain/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const querySchema = z.object({ edition: z.uuid() });

export const GET = route(async (request: Request) => {
  await requireUserId();
  const { edition } = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const { bytes, filename } = await getEditionPdf(edition);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
});