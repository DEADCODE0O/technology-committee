import { redirect } from "next/navigation";
import { getCurrentUser, getUnverifiedSessionUser } from "@/lib/auth";
import { Landing } from "@/components/site/landing";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  /welcome — «الموقع العام» التعريفي (دائم — لا يحوّل أبدًا)
//  يصل إليه الزائر من الرابط الجانبي في صفحات الدخول والتسجيل
// ═══════════════════════════════════════════════════════════════

export default async function WelcomePage() {
  const unverified = await getUnverifiedSessionUser();
  if (unverified) {
    redirect(`/register/verify?email=${encodeURIComponent(unverified.email)}&notice=need_verification`);
  }

  const user = await getCurrentUser();
  return <Landing user={user} />;
}
