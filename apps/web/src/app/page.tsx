import { redirect } from "next/navigation";
import { requireUserSession } from "@/server/application/session-service";
import { getUserProfile } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { supabase, user } = await requireUserSession();
  const profile = await getUserProfile(supabase, user.id);

  if (!profile?.onboarding_completed_at) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
