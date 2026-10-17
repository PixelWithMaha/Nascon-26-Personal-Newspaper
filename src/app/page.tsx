import { redirect } from "next/navigation";
import { getSupabaseUser } from "@/server/integrations/supabase";
import { hasPreferences } from "@/server/domain/preferences";

export default async function Home() {
  const supabase = await getSupabaseUser();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/onboarding");
  redirect((await hasPreferences(data.user.id)) ? "/paper" : "/onboarding");
}