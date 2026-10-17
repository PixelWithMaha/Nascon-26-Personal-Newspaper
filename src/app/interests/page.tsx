import Link from "next/link";
import { redirect } from "next/navigation";
import { InterestsView } from "@/features/interests";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { getInterestsData } from "@/server/domain/interests";

export const maxDuration = 60;

export default async function InterestsPage() {
  const userId = await getOptionalUserId();
  if (!userId) redirect("/onboarding");
  const data = await getInterestsData(userId);
  if (!data) redirect("/onboarding");

  return (
    <main className="min-h-dvh bg-[#e6e0d2] px-2 pb-12 md:px-6">
      <nav className="mx-auto max-w-6xl py-4">
        <Link
          href="/paper"
          className="font-condensed text-xs uppercase tracking-[0.25em] text-ink underline-offset-4 hover:underline"
        >
          ← Back to today&apos;s paper
        </Link>
      </nav>
      <InterestsView initial={data} />
    </main>
  );
}