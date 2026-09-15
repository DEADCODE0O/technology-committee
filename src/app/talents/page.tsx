import Image from "next/image";
import { notFound } from "next/navigation";
import { Sparkles, Palette, Trophy, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { getTalentsSectionVisible } from "@/lib/platform";
import { SitePageShell, EmptyState } from "@/components/platform/site-page-shell";
import { talentLabel, TALENT_CATEGORY_LABELS, GRADE_LABELS, SECTION_LABELS } from "@/lib/constants";
import { resolveImageSrc, safeExternalUrl } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";

export const dynamic = "force-dynamic";

// ═══════════════════════════════════════════════════════════════
//  صفحة المواهب المميزة — بصور الطلاب (درايف/رابط/رفع)
//  عند إيقاف القسم من الإعدادات: الصفحة تختفي كليًا (404) —
//  لا رسالة «مغلق» ولا روابط تظهر لأي طالب
// ═══════════════════════════════════════════════════════════════

export default async function TalentsPage() {
  const sectionVisible = await getTalentsSectionVisible();

  // القسم موقوف → الصفحة غير موجودة نهائيًا (404 كاملة)
  if (!sectionVisible) notFound();

  const talents = await db.talent.findMany({
    where: { featured: true, status: "VERIFIED" },
    include: { user: { include: { profile: true } } },
    orderBy: { updatedAt: "desc" },
    take: 24,
  });

  return (
    <SitePageShell
      title="المواهب المميزة"
      subtitle="طلاب من مجتمعنا — مواهبهم مختارة بعناية من إدارة اللجنة."
    >
      {talents.length === 0 ? (
        <EmptyState
          icon={<Palette className="h-7 w-7" />}
          title="مفيش مواهب مميزة حاليًا"
          hint="المواهب بتظهر هنا باختيار الإدارة — تابعنا قريبًا."
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {talents.map((t) => {
            const displayName = t.user?.profile?.fullName ?? t.personName ?? "طالب";
            const gradeLabel = t.user?.profile?.grade ?? t.personGrade ?? "";
            const sectionLabel = t.user?.profile?.section ?? t.personSection ?? "";
            const initials = displayName.split(" ").slice(0, 2).map((w) => w[0]).join(" ");
            const imgSrc = resolveImageSrc(t.imageUrl);

            return (
              <article
                key={t.id}
                className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-surface transition-all duration-500 hover:-translate-y-1 hover:border-gold/30"
              >
                <div className="gold-glow-bg pointer-events-none absolute inset-x-0 -top-20 h-32 opacity-0 transition-opacity duration-500 group-hover:opacity-60" aria-hidden="true" />

                {/* صورة الطالب إن وُجدت */}
                {imgSrc ? (
                  <div className="relative h-52 w-full overflow-hidden">
                    <SmartImg
                      src={imgSrc}
                      alt={`صورة ${displayName}`}
                      fallback="/images/hero-bg.webp"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/10 to-transparent" />
                    <div className="absolute bottom-0 w-full p-5">
                      <h3 className="text-lg font-extrabold text-white drop-shadow">{displayName}</h3>
                      {(gradeLabel || sectionLabel) && (
                        <p className="mt-0.5 text-xs text-zinc-300/90">
                          {GRADE_LABELS[gradeLabel] ?? ""} {sectionLabel ? `— ${SECTION_LABELS[sectionLabel] ?? ""}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-6 pb-0">
                    {/* الأفاتار — الأحرف الأولى */}
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gradient-to-b from-gold/15 to-transparent text-xl font-extrabold text-gold-light">
                      {initials}
                      <Image src="/images/logo.png" alt="" width={20} height={20} className="absolute -bottom-1 -end-1 h-6 w-6 rounded-md border-2 border-surface" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-extrabold text-zinc-50">{displayName}</h3>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {GRADE_LABELS[gradeLabel] ?? ""} {sectionLabel ? `— ${SECTION_LABELS[sectionLabel] ?? ""}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 p-6">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.08] px-3.5 py-1.5 text-sm font-extrabold text-gold-light">
                      <Sparkles className="h-4 w-4" />
                      {talentLabel(t.category, t.name, t.customName)}
                    </span>
                    <span className="text-[11px] font-bold text-zinc-600">{TALENT_CATEGORY_LABELS[t.category]}</span>
                  </div>

                  {t.description && (
                    <p className="text-sm leading-7 text-zinc-400">{t.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
                      <Trophy className="h-3.5 w-3.5 text-gold/50" />
                      موهبة موثّقة من إدارة اللجنة
                    </div>
                    {t.portfolioUrl && (
                      <a
                        href={safeExternalUrl(t.portfolioUrl)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-bold text-zinc-300 transition-colors hover:border-gold/30 hover:text-gold-light"
                      >
                        <ExternalLink className="h-3 w-3" />
                        أعماله
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SitePageShell>
  );
}
