import Link from "next/link";
import { redirect } from "next/navigation";
import { DownloadPdfButton, GenerateButton, Newspaper } from "@/features/edition";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { getHiddenStoryIds, getLatestEdition } from "@/server/domain/editions";

const navLink =
  "font-condensed text-xs uppercase tracking-[0.25em] text-ink underline-offset-4 hover:underline";

export default async function PaperPage() {
  const userId = await getOptionalUserId();
  if (!userId) redirect("/onboarding");
  const latest = await getLatestEdition(userId);
  const hiddenStoryIds = latest ? await getHiddenStoryIds(latest.id) : [];

  return (
    <main className="min-h-dvh bg-[#e6e0d2] px-2 pb-12 md:px-6">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex flex-wrap gap-5">
          <Link href="/interests" className={navLink}>
            What we know about you
          </Link>
          <Link href="/archive" className={navLink}>
            Archive
          </Link>
        </div>
        <div className="flex items-start gap-3">
          {latest && <DownloadPdfButton editionId={latest.id} editionDate={latest.edition.editionDate} />}
          <GenerateButton
            label={latest ? "Print a fresh edition" : "Print today's edition"}
            autoStart={!latest}
          />
        </div>
      </nav>

      {latest ? (
        <Newspaper editionId={latest.id} edition={latest.edition} hiddenStoryIds={hiddenStoryIds} />
      ) : (
        <div className="mx-auto max-w-6xl bg-paper px-6 py-24 text-center text-ink">
          <p className="font-blackletter text-6xl md:text-8xl">The Morning Paper</p>
          <p className="mt-6 font-display text-2xl italic">The presses are rolling on your first edition…</p>
        </div>
      )}
    </main>
  );
}