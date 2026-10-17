import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { DownloadPdfButton, Newspaper } from "@/features/edition";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { getEditionRecord, getHiddenStoryIds } from "@/server/domain/editions";
import { SiteLogo } from "@/components/SiteLogo";

export default async function ArchivedEditionPage({ params }: PageProps<"/archive/[id]">) {
  const { id } = await params;
  const userId = await getOptionalUserId();
  if (!userId) redirect("/onboarding");
  if (!z.uuid().safeParse(id).success) notFound();

  const record = await getEditionRecord(id);
  if (!record) notFound();
  const hiddenStoryIds = await getHiddenStoryIds(record.id);

  return (
    <main className="min-h-dvh bg-[#e6e0d2] px-2 pb-12 md:px-6">
           <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-5">
          <SiteLogo />
          <Link
            href="/archive"
            className="font-condensed text-xs uppercase tracking-[0.25em] text-ink underline-offset-4 hover:underline"
          >
            ← The archive
          </Link>
        </div>
        <DownloadPdfButton editionId={record.id} editionDate={record.edition.editionDate} />
      </nav>
      <Newspaper editionId={record.id} edition={record.edition} hiddenStoryIds={hiddenStoryIds} />
    </main>
  );
}