import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Offerings } from "@/components/site/offerings";
import { FreeMessage } from "@/components/site/free-message";
import { VideoSection } from "@/components/site/video-section";
import { Gallery } from "@/components/site/gallery";
import { About } from "@/components/site/about";
import { JoinCta } from "@/components/site/join-cta";
import { Contact } from "@/components/site/contact";
import { Footer } from "@/components/site/footer";
import { getTalentsSectionVisible } from "@/lib/platform";
import type { SessionUser } from "@/lib/auth";

// ═══════════════════════════════════════════════════════════════
//  محتوى «الموقع العام» (صفحة اللاندنج التعريفية باللجنة)
//  يُعرض في: / (أول زيارة فقط) و /welcome (دائمًا عبر الرابط الجانبي)
// ═══════════════════════════════════════════════════════════════

export async function Landing({ user }: { user: SessionUser | null }) {
  const talentsVisible = await getTalentsSectionVisible();

  return (
    <div className="relative flex min-h-svh flex-col overflow-x-clip bg-background">
      <div className="noise-overlay" aria-hidden="true" />
      <Navbar user={user ? { name: user.profile?.fullName ?? user.email, role: user.role } : null} showTalents={talentsVisible} />

      <main className="flex-1">
        <Hero />

        <div className="relative mt-2 overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gold/[0.04] to-transparent" />
          <Offerings />
          <FreeMessage />
          <VideoSection />
          <Gallery />
          <About />
          <JoinCta />
          <Contact />
        </div>
      </main>

      <Footer />
    </div>
  );
}
