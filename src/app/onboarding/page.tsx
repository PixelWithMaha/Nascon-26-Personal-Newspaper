import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/features/onboarding";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { hasPreferences } from "@/server/domain/preferences";

export default async function OnboardingPage() {
  const userId = await getOptionalUserId();
  if (userId && (await hasPreferences(userId))) redirect("/interests");

  return (
    <main className="min-h-dvh px-4 py-10">
      <OnboardingFlow />
    </main>
  );
}