import { redirect } from "next/navigation";
import { getCurrentUser, getUnverifiedSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const unverified = await getUnverifiedSessionUser();
  if (unverified) {
    redirect(`/register/verify?email=${encodeURIComponent(unverified.email)}&notice=need_verification`);
  }

  const user = await getCurrentUser();
  if (user) {
    redirect(isAdminRole(user.role) ? "/admin" : "/panel");
  }
  redirect("/login");
}
