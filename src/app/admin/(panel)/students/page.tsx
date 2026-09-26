import Link from "next/link";
import { Search, ChevronRight, ChevronLeft, Zap, Users, Download } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { findTargetedStudentIds } from "@/lib/targeting";
import { GRADES, SECTIONS, GENDERS, GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, levelFromPoints } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuspendToggle, ImpersonateStudentButton, VerifyStudentDirectlyButton, ResendStudentOtpButton } from "@/components/admin/student-actions";
import { ContactsExportModal } from "@/components/admin/contacts-export-modal";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
//  إدارة الطلاب — بحث شامل + تصنيف دقيق:
//  الفرقة / الشعبة / الجنس / الحالة / الحضور / المواهب / المتفوقين
// ═══════════════════════════════════════════════════════════════

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; grade?: string; section?: string; gender?: string; status?: string; attendance?: string; talent?: string; minPoints?: string; page?: string }> | { q?: string; grade?: string; section?: string; gender?: string; status?: string; attendance?: string; talent?: string; minPoints?: string; page?: string };
}) {
  const admin = await requireAdmin(MODULES.STUDENTS);
  const canManage = canUser(admin, MODULES.STUDENTS, "manage");
  const sp = (searchParams ? await Promise.resolve(searchParams) : {}) || {};

  const q = (sp.q ?? "").trim();
  const grade = GRADES.some((g) => g.value === sp.grade) ? sp.grade! : "";
  const section = SECTIONS.some((s) => s.value === sp.section) ? sp.section! : "";
  const gender = GENDERS.some((g) => g.value === sp.gender) ? sp.gender! : "";
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" || sp.status === "PENDING_VERIFICATION" ? sp.status : "";
  const attendance: "ATTENDED" | "NOT_ATTENDED" | "" = sp.attendance === "ATTENDED" || sp.attendance === "NOT_ATTENDED" ? sp.attendance : "";
  const talent: "HAS" | "VERIFIED" | "NONE" | "" = sp.talent === "HAS" || sp.talent === "VERIFIED" || sp.talent === "NONE" ? sp.talent : "";
  const minPoints = Number(sp.minPoints) > 0 ? Number(sp.minPoints) : 0;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  // شروط البحث والفلترة الأساسية
  const where: Record<string, unknown> = { role: "STUDENT" };
  if (status) where.status = status;
  const profileCond: Record<string, unknown> = {};
  if (grade) profileCond.grade = grade;
  if (section) profileCond.section = section;
  if (gender) profileCond.gender = gender;
  if (Object.keys(profileCond).length) where.profile = { is: profileCond };
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { profile: { is: { fullName: { contains: q } } } },
      { profile: { is: { phone: { contains: q } } } },
      { profile: { is: { studentCode: { contains: q } } } },
    ];
  }

  // تصنيف متقدم: الحضور / المواهب / المتفوقون — عبر محرك الاستهداف
  if (attendance || talent || minPoints) {
    const ids = await findTargetedStudentIds({
      grades: grade ? [grade] : [],
      sections: section ? [section] : [],
      genders: gender ? [gender] : [],
      attendance: (attendance || "ANY") as "ANY" | "ATTENDED" | "NOT_ATTENDED",
      talent: (talent || "ANY") as "ANY" | "HAS" | "VERIFIED" | "NONE",
      minPoints: minPoints || null,
      userIds: [],
      sessionId: null,
      runId: null,
      activityId: null,
      programId: null,
      teamId: null,
      scope: "REGISTERED",

    });
    where.id = { in: ids };
  }

  const [total, students] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      include: {
        profile: true,
        talents: { where: { status: "VERIFIED" }, select: { id: true } },
        badges: { select: { badgeId: true } },
        pointEvents: { select: { points: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (grade) params.set("grade", grade);
    if (section) params.set("section", section);
    if (gender) params.set("gender", gender);
    if (status) params.set("status", status);
    if (attendance) params.set("attendance", attendance);
    if (talent) params.set("talent", talent);
    if (minPoints) params.set("minPoints", String(minPoints));
    const p = typeof over.page === "number" ? over.page : page;
    if (p > 1) params.set("page", String(p));
    return `/admin/students${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const buildExportHref = () => {
    const params = new URLSearchParams();
    if (q) params.set("q", q); if (grade) params.set("grade", grade); if (section) params.set("section", section); if (gender) params.set("gender", gender); if (status) params.set("status", status); if (attendance) params.set("attendance", attendance); if (talent) params.set("talent", talent); if (minPoints) params.set("minPoints", String(minPoints));
    return `/api/admin/students/export${params.toString() ? `?${params.toString()}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
        <h1 className="text-2xl font-extrabold text-zinc-50">إدارة الطلاب</h1>
        <p className="mt-1 text-sm text-zinc-500">
          <Users className="inline h-4 w-4 text-gold/60" /> {total.toLocaleString("ar-EG")} طالبًا مطابقًا — ابحث بالاسم أو الهاتف أو البريد أو الكود، وصنّف بالفرقة والشعبة والجنس والحضور والمواهب والتفوق
        </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2.5">
            <ContactsExportModal
              currentFilters={{
                q,
                grade,
                section,
                gender,
                status,
              }}
            />
            <a href={buildExportHref()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-gold/30 bg-gold/[0.08] px-4 text-xs font-extrabold text-gold-light hover:bg-gold/[0.14]">
              <Download className="h-4 w-4" />
              تصدير النتائج Excel
            </a>
          </div>
        )}
      </div>

      {/* البحث والفلاتر */}
      <form method="GET" action="/admin/students" className="grid grid-cols-1 gap-3 rounded-3xl border border-white/[0.06] bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="mb-1.5 block text-xs font-bold text-zinc-500">بحث</label>
          <div className="relative">
            <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <Input name="q" defaultValue={q} placeholder="اسم / هاتف / بريد / كود..." className="h-11 rounded-xl pe-9" />
          </div>
        </div>
        <FilterSelect name="grade" label="الفرقة" value={grade} options={GRADES.map((g) => ({ value: g.value, label: g.label }))} />
        <FilterSelect name="section" label="الشعبة" value={section} options={SECTIONS.map((s) => ({ value: s.value, label: s.label }))} />
        <FilterSelect name="gender" label="الجنس" value={gender} options={GENDERS.map((g) => ({ value: g.value, label: g.label }))} />
        <FilterSelect
          name="attendance"
          label="الحضور"
          value={attendance}
          options={[
            { value: "ATTENDED", label: "حضروا ورشة واحدة على الأقل" },
            { value: "NOT_ATTENDED", label: "لم يحضروا أي ورشة" },
          ]}
        />
        <FilterSelect
          name="talent"
          label="المواهب"
          value={talent}
          options={[
            { value: "HAS", label: "لديهم مواهب" },
            { value: "VERIFIED", label: "مواهب موثقة (الموهوبون)" },
            { value: "NONE", label: "بدون مواهب" },
          ]}
        />
        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-500">المتفوقون (نقاط ≥)</label>
          <Input dir="ltr" name="minPoints" type="number" min={1} defaultValue={minPoints || ""} placeholder="مثال: 100" className="h-11 rounded-xl text-start" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-zinc-500">الحالة</label>
          <input type="hidden" name="status" value={status} id="status-hidden" />
          <SelectStatusParam defaultValue={status} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="h-11 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-xs font-extrabold text-night">
            تطبيق الفلاتر
          </Button>
        </div>
      </form>

      {/* الجدول */}
      {students.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gold/15 bg-white/[0.01] px-6 py-16 text-center">
          <p className="text-lg font-bold text-zinc-300">مفيش نتائج</p>
          <p className="mt-2 text-sm text-zinc-500">جرب كلمات بحث مختلفة أو شيل الفلاتر</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-xs">
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500">الطالب</th>
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500">التواصل</th>
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500">الفرقة / الشعبة</th>
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500">النشاط</th>
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500">الحالة</th>
                  <th className="px-4 py-3.5 text-start font-bold text-zinc-500"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const points = s.pointEvents.reduce((sum, e) => sum + e.points, 0);
                  return (
                    <tr key={s.id} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                      <td className="px-4 py-3.5">
                        <Link href={`/admin/students/${s.id}`} className="group flex items-center gap-3">
                          <AvatarWithFrame
                            avatarUrl={s.avatarUrl}
                            name={s.profile?.fullName ?? s.email}
                            frameId={s.avatarFrameId}
                            size="xs"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-zinc-100 group-hover:text-gold-light">{s.profile?.fullName ?? s.email}</p>
                            {s.profile?.studentCode && <p className="text-[10px] text-zinc-600" dir="ltr">كود: {s.profile.studentCode}</p>}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">
                        <p dir="ltr" className="text-start">{s.profile?.phone ?? "—"}</p>
                        <p dir="ltr" className="truncate text-start text-zinc-600">
                          {s.email}
                          {s.provider === "GOOGLE" && (
                            <span className="ms-1 inline-flex items-center gap-1 rounded-md border border-sky-400/25 bg-sky-400/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-sky-300" title="مسجل بحساب Google">
                              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                              Google
                            </span>
                          )}
                          {s.provider === "EMAIL" && (
                            <span className="ms-1 inline-flex items-center gap-1 rounded-md border border-purple-400/25 bg-purple-400/[0.08] px-1.5 py-0.5 text-[9px] font-bold text-purple-300" title="مسجل بالبريد وكلمة السر">
                              بريد
                            </span>
                          )}
                          {!s.profile && (
                            <span className="ms-1 inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/[0.1] px-1.5 py-0.5 text-[9px] font-bold text-amber-300" title="لم يكتمل الملف الطلابي بعد">
                              غير مكتمل
                            </span>
                          )}
                          {s.provider === "FACEBOOK" && (
                            <span className="ms-1 inline-flex items-center gap-1 rounded-md border border-blue-500/25 bg-blue-500/[0.1] px-1.5 py-0.5 text-[9px] font-bold text-blue-400" title="مسجل بحساب Facebook">
                              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-current" aria-hidden="true">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                              Facebook
                            </span>
                          )}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-zinc-400">
                        {GRADE_LABELS[s.profile?.grade ?? ""] ?? "—"}
                        <span className="text-zinc-600"> / {SECTION_LABELS[s.profile?.section ?? ""] ?? "—"}</span>
                        <p className="text-zinc-600">{GENDER_LABELS[s.profile?.gender ?? ""] ?? ""}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-xs font-extrabold text-gold-light">
                          <Zap className="h-3.5 w-3.5" />
                          {points} نقطة
                        </span>
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          مستوى {levelFromPoints(points)} · {s.badges.length} شارة{s.talents.length > 0 ? ` · ${s.talents.length} موهبة` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          s.status === "ACTIVE"
                            ? "border border-gold/25 bg-gold/[0.06] text-gold-light"
                            : s.status === "PENDING_VERIFICATION"
                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border border-red-500/25 bg-red-500/[0.06] text-red-300"
                        }`}>
                          {s.status === "ACTIVE" ? "نشط" : s.status === "PENDING_VERIFICATION" ? "بانتظار تأكيد OTP" : "معلق"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && s.status === "PENDING_VERIFICATION" && (
                            <>
                              <ResendStudentOtpButton
                                userId={s.id}
                                studentName={s.profile?.fullName ?? s.email}
                              />
                              <VerifyStudentDirectlyButton
                                userId={s.id}
                                studentName={s.profile?.fullName ?? s.email}
                              />
                            </>
                          )}
                          {canManage && s.status !== "PENDING_VERIFICATION" && (
                            <ImpersonateStudentButton
                              userId={s.id}
                              studentName={s.profile?.fullName ?? s.email}
                              variant="icon"
                            />
                          )}
                          {canManage && <SuspendToggle userId={s.id} active={s.status === "ACTIVE"} />}
                          <Link href={`/admin/students/${s.id}`} className="rounded-lg border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-xs font-extrabold text-gold-light hover:bg-gold/[0.15]">
                            الملف
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* الصفحات */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={buildHref({ page: page - 1 })} className="flex h-10 items-center gap-1 rounded-xl border border-white/[0.1] px-4 text-xs font-bold text-zinc-300 hover:border-gold/30">
              <ChevronRight className="h-4 w-4" />
              السابق
            </Link>
          )}
          <span className="rounded-xl border border-gold/30 bg-gold/[0.08] px-4 py-2 text-xs font-extrabold text-gold-light">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildHref({ page: page + 1 })} className="flex h-10 items-center gap-1 rounded-xl border border-white/[0.1] px-4 text-xs font-bold text-zinc-300 hover:border-gold/30">
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-zinc-500">{label}</label>
      <input type="hidden" name={name} value={value} id={`${name}-hidden`} />
      <FilterSelectProxy selectName={name} value={value} options={options} />
    </div>
  );
}

// مكون عميل صغير للـ Select اللي بتحديث hidden input
import { FilterSelectProxy, SelectStatusParam } from "@/components/admin/filter-selects";
