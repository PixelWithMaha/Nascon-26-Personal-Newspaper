import Link from "next/link";
import { redirect } from "next/navigation";
import { EditionStack } from "@/features/archive";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { listEditionSummaries } from "@/server/domain/archive";

export default async function ArchivePage() {
  const userId = await getOptionalUserId();
  if (!userId) redirect("/onboarding");
  const editions = await listEditionSummaries(userId);

  return (
    <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#3a3327_0%,#17140f_55%,#0d0b08_100%)] px-4 pb-16 text-paper">
      <nav className="mx-auto max-w-6xl py-4">
        <Link
          href="/paper"
          className="font-condensed text-xs uppercase tracking-[0.25em] text-paper/80 underline-offset-4 hover:underline"
        >
          ← Today&apos;s paper
        </Link>
      </nav>

      <header className="mx-auto max-w-3xl text-center">
        <h1 className="font-blackletter text-5xl md:text-7xl">The Archive</h1>
        <p className="mt-3 font-display italic text-paper/70">
          Every paper we&apos;ve printed for you. Scroll, swipe or use the arrow keys to leaf through.
        </p>
      </header>

      <div className="mx-auto mt-10 max-w-6xl">
        {editions.length === 0 ? (
          <p className="py-24 text-center font-display text-xl italic text-paper/70">
            No editions yet. Your first paper will appear here once it&apos;s printed.
          </p>
        ) : (
          <EditionStack editions={editions} />
        )}
      </div>
    </main>
  );
}