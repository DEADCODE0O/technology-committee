import { getCurrentUser } from "@/lib/auth";
import { Landing } from "@/components/site/landing";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  /welcome — «الموقع العام» التعريفي (دائم — لا يحوّل أبدًا)
//  يصل إليه الزائر من الرابط الجانبي في صفحات الدخول والتسجيل
// ═══════════════════════════════════════════════════════════════

export default async function WelcomePage() {
  const user = await getCurrentUser();
  return <Landing user={user} />;
}
