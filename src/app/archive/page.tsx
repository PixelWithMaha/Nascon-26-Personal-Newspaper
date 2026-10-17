import Link from "next/link";
import { redirect } from "next/navigation";
import { EditionStack } from "@/features/archive";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { SiteLogo } from "@/components/SiteLogo";
import { listEditionSummaries } from "@/server/domain/archive";

export default async function ArchivePage() {
  const userId = await getOptionalUserId();
  if (!userId) redirect("/onboarding");
  const editions = await listEditionSummaries(userId);

  return (
    <main
      data-theme="archive"
      className="flex h-dvh flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#3a3327_0%,#17140f_55%,#0d0b08_100%)] px-4 text-paper"
    >
           <nav className="mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between py-3">
        <SiteLogo tone="dark" />
        <Link
          href="/paper"
          className="font-condensed text-xs uppercase tracking-[0.25em] text-paper/80 underline-offset-4 hover:underline"
        >
          Today&apos;s paper →
        </Link>
      </nav>

           <header className="shrink-0 text-center">
        <h1 className="font-blackletter text-3xl leading-none md:text-5xl">The Archive</h1>
        <p className="mt-1 hidden font-display text-sm italic text-paper/70 sm:block">
          Every paper we&apos;ve printed for you. Scroll, swipe or use the arrow keys to leaf through.
        </p>
      </header>

            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col pb-3 pt-2">
        {editions.length === 0 ? (
          <p className="grid flex-1 place-items-center font-display text-xl italic text-paper/70">
            No editions yet. Your first paper will appear here once it&apos;s printed.
          </p>
        ) : (
          <EditionStack editions={editions} />
        )}
      </div>
    </main>
  );
}