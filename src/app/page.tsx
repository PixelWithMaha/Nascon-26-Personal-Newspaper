import { LandingPage } from "@/features/landing";
import { getOptionalUserId } from "@/server/integrations/supabase";
import { hasPreferences } from "@/server/domain/preferences";

export default async function Home() {
  const userId = await getOptionalUserId();
  const returning = userId ? await hasPreferences(userId) : false;
  return <LandingPage returning={returning} />;
}