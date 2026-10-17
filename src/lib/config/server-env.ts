import "server-only";
import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  CRON_SECRET: z.string().min(1),
});

let cached: z.infer<typeof serverSchema> | undefined;

// Parsed on first use, not at import, so `next build` doesn't need real secrets.
export function serverEnv() {
  cached ??= serverSchema.parse(process.env);
  return cached;
}