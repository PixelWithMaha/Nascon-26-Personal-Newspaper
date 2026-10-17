"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }),
  );
  const [ready, setReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error && !cancelled) setAuthError(error.message);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authError) {
    return <p className="p-8 text-destructive">Couldn&apos;t start a session: {authError}</p>;
  }
  if (!ready) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted-foreground">
        Preparing your paper…
      </div>
    );
  }
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}