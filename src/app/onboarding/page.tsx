import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/features/onboarding";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { hasPreferences } from "@/server/domain/preferences";

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const userId = await getOptionalUserId();
  if (userId && (await hasPreferences(userId))) redirect("/interests");

  const { name } = await searchParams;
  const initialName = typeof name === "string" ? name.trim().slice(0, 40) : "";

  return (
    <main className="min-h-dvh px-4 py-10">
      <OnboardingFlow initialName={initialName} />
    </main>
  );
}