import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/config/env";
import { serverEnv } from "@/lib/config/server-env";
import { HttpError } from "@/server/http";
import { AsyncLocalStorage } from "node:async_hooks";

/** Acts as the signed-in reader. RLS applies. */
export async function getSupabaseUser() {
  const cookieStore = await cookies();
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a context that can't set cookies; the proxy refreshes them.
          }
        },
      },
    },
  );
}

/** Server-only admin client. Bypasses RLS: use for writing editions and PDFs. */
export function getSupabaseAdmin() {
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Returns the current reader's id or throws 401. */
export async function requireUserId(): Promise<string> {
  const supabase = await getSupabaseUser();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "Not signed in");
  return data.user.id;
}

/** Current reader's id, or null when there is no session. */
export async function getOptionalUserId(): Promise<string | null> {
  const supabase = await getSupabaseUser();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
const systemScope = new AsyncLocalStorage<true>();

/** Runs `fn` as the system (cron): domain queries use the admin client instead of a reader's session. */
export function runAsSystem<T>(fn: () => Promise<T>): Promise<T> {
  return systemScope.run(true, fn);
}

/**
 * The client domain code should use: the reader's session (RLS) normally,
 * the admin client inside runAsSystem. Queries must always filter by user_id explicitly.
 */
export async function db() {
  return systemScope.getStore() ? getSupabaseAdmin() : getSupabaseUser();
}