import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Mail, Phone, GraduationCap, Users, IdCard, HelpCircle, CalendarDays, LogIn,
  Zap, Medal, Palette, CheckCircle2, XCircle, ScrollText,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import {
  GRADE_LABELS, SECTION_LABELS, GENDER_LABELS, DISCOVERY_LABELS, JOIN_REASON_LABELS,
  levelFromPoints, TALENT_STATUS_LABELS, talentLabel, REGISTRATION_STATUS_LABELS,
  REGISTRATION_SOURCE_LABELS,
} from "@/lib/constants";
import { SuspendToggle, AddPointsButton, AwardBadgeButton, ResetPasswordButton, DeleteStudentButton } from "@/components/admin/student-actions";
import { ReversePointEventButton, DeletePointEventButton } from "@/components/admin/points-tools";
import { EditStudentButton } from "@/components/admin/edit-student-form";
import { SetTalentStatusButtons } from "@/components/admin/talent-actions";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

export const dynamic = "force-dynamic";

function formatDateAr(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default async function AdminStudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(MODULES.STUDENTS);
  const canManage = canUser(admin, MODULES.STUDENTS, "manage");
  const canPoints = canUser(admin, MODULES.POINTS, "manage");
  const canBadges = canUser(admin, MODULES.BADGES, "manage");
  const canTalents = canUser(admin, MODULES.TALENTS, "manage");
  const { id } = await params;

  const student = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      talents: true,
      studentData: { orderBy: { updatedAt: "desc" } },
      badges: { include: { badge: true }, orderBy: { awardedAt: "desc" } },
      pointEvents: { orderBy: { createdAt: "desc" }, take: 30, include: { session: { include: { activity: { select: { title: true } } } }, createdBy: { select: { email: true } } } },
      registrations: { include: { session: { include: { activity: { select: { id: true, title: true, type: true } } } }, attendance: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!student || student.role !== "STUDENT") notFound();

  const points = student.pointEvents.reduce((s, e) => s + e.points, 0);
  const level = levelFromPoints(points);
  const allBadges = await db.badge.findMany({ where: { active: true } });
  const pointRules = await db.pointRule.findMany({ where: { active: true } });

  const joinReasons = student.profile?.joinReasons ? (() => { try { return JSON.parse(student.profile.joinReasons) as string[]; } catch { return []; } })() : [];
  const attendedCount = student.registrations.filter((r) => r.attendance.some((a) => a.present)).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* الرأس */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/admin/students" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-gold-light">
            <ArrowLeft className="h-3.5 w-3.5" />
            كل الطلاب
          </Link>
          <div className="flex items-center gap-4">
            <AvatarWithFrame
              avatarUrl={student.avatarUrl}
              name={student.profile?.fullName ?? student.email}
              frameId={student.avatarFrameId}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-extrabold text-zinc-50">{student.profile?.fullName ?? student.email}</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {points} نقطة · مستوى {level} · حضر {attendedCount} ورشة · انضم {formatDateAr(student.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* الإجراءات */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <EditStudentButton
              userId={student.id}
              initial={{
                fullName: student.profile?.fullName ?? "",
                email: student.email,
                phone: student.profile?.phone ?? "",
                grade: student.profile?.grade ?? "FIRST",
                section: student.profile?.section ?? "IS",
                gender: student.profile?.gender ?? "MALE",
                studentCode: student.profile?.studentCode ?? "",
              }}
            />
          )}
          {canPoints && <AddPointsButton userId={student.id} studentName={student.profile?.fullName ?? student.email} pointRules={pointRules} />}
          {canBadges && <AwardBadgeButton userId={student.id} studentName={student.profile?.fullName ?? student.email} badges={allBadges.map((b) => ({ id: b.id, name: b.name, icon: b.icon }))} />}
          {canManage && <ResetPasswordButton userId={student.id} studentName={student.profile?.fullName ?? student.email} />}
          {canManage && <SuspendToggle userId={student.id} active={student.status === "ACTIVE"} />}
          {canManage && <DeleteStudentButton userId={student.id} studentName={student.profile?.fullName ?? student.email} />}
        </div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        {/* العمود الأول: البيانات */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
            <h2 className="mb-4 text-sm font-extrabold text-zinc-100">المعلومات الشخصية</h2>
            <ul className="space-y-2.5 text-sm">
              <Info icon={<Mail className="h-4 w-4" />} label="البريد" value={student.email} ltr />
              <Info
                icon={<LogIn className="h-4 w-4" />}
                label="طريقة التسجيل"
                value={
                  student.provider === "GOOGLE"
                    ? "مسجل بحساب Google"
                    : student.provider === "FACEBOOK"
                    ? "مسجل بحساب Facebook"
                    : "بالبريد وكلمة السر"
                }
              />
              <Info icon={<Phone className="h-4 w-4" />} label="الهاتف" value={student.profile?.phone ?? "—"} ltr />
              <Info icon={<GraduationCap className="h-4 w-4" />} label="الفرقة" value={GRADE_LABELS[student.profile?.grade ?? ""] ?? "—"} />
              <Info icon={<Users className="h-4 w-4" />} label="الشعبة" value={SECTION_LABELS[student.profile?.section ?? ""] ?? "—"} />
              <Info icon={<Users className="h-4 w-4" />} label="الجنس" value={GENDER_LABELS[student.profile?.gender ?? ""] ?? "—"} />
              <Info icon={<IdCard className="h-4 w-4" />} label="كود الطالب" value={student.profile?.studentCode ?? "غير مسجل"} ltr />
              <Info icon={<HelpCircle className="h-4 w-4" />} label="مصدر التعارف" value={student.profile?.discoverySource ? DISCOVERY_LABELS[student.profile.discoverySource] ?? "—" : "—"} />
            </ul>
            {joinReasons.length > 0 && (
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="mb-2 text-xs font-bold text-zinc-500">أسباب الانضمام</p>
                <div className="flex flex-wrap gap-1.5">
                  {joinReasons.map((r) => (
                    <span key={r} className="rounded-full border border-gold/20 bg-gold/[0.06] px-2.5 py-1 text-[10px] font-bold text-gold-pale">
                      {r.startsWith("OTHER:") ? r.slice(6) : JOIN_REASON_LABELS[r] ?? r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {student.studentData.length > 0 && (
            <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
              <h2 className="mb-4 text-sm font-extrabold text-zinc-100">بيانات محفوظة من طلبات اللجنة</h2>
              <div className="space-y-2">
                {student.studentData.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                    <p className="text-[10px] font-bold text-zinc-500">{item.label}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs font-bold text-zinc-200">{formatStudentData(item.value)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* الشارات */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-zinc-100">
              <Medal className="h-4 w-4 text-gold/80" />
              الشارات ({student.badges.length})
            </h2>
            {student.badges.length === 0 ? (
              <p className="text-xs text-zinc-600">لا شارات بعد</p>
            ) : (
              <ul className="space-y-2">
                {student.badges.map((sb) => (
                  <li key={sb.badgeId} className="flex items-center gap-3 rounded-xl border border-gold/15 bg-gold/[0.03] px-3 py-2.5">
                    <span className="text-lg">{sb.badge.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-gold-light">{sb.badge.name}</p>
                      <p className="text-[10px] text-zinc-600">{formatDateAr(sb.awardedAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* المواهب */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-zinc-100">
              <Palette className="h-4 w-4 text-gold/80" />
              المواهب
            </h2>
            {student.talents.length === 0 ? (
              <p className="text-xs text-zinc-600">لا مواهب مسجلة</p>
            ) : (
              <ul className="space-y-3">
                {student.talents.map((t) => (
                  <li key={t.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                    <p className="text-xs font-bold text-zinc-200">{talentLabel(t.category, t.name, t.customName)}</p>
                    {t.description && <p className="mt-1 text-[11px] leading-5 text-zinc-500">{t.description}</p>}
                    <p className="mt-1.5 text-[10px] font-bold text-zinc-600">{TALENT_STATUS_LABELS[t.status]}{t.featured ? " · مميزة على الموقع" : ""}</p>
                    {canTalents && (
                      <div className="mt-2.5">
                        <SetTalentStatusButtons talentId={t.id} status={t.status} featured={t.featured} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* العمود الثاني والثالث */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* التسجيلات */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-zinc-100">
              <CalendarDays className="h-4 w-4 text-gold/80" />
              تسجيلات الورش ({student.registrations.length})
            </h2>
            {student.registrations.length === 0 ? (
              <p className="text-xs text-zinc-600">مفيش تسجيلات</p>
            ) : (
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-zinc-500">
                      <th className="py-2.5 text-start font-bold">الورشة</th>
                      <th className="py-2.5 text-start font-bold">الحالة</th>
                      <th className="py-2.5 text-start font-bold">المصدر</th>
                      <th className="py-2.5 text-start font-bold">الحضور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.registrations.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.04]">
                        <td className="py-2.5">
                          <Link href={`/admin/sessions/${r.session.id}`} className="font-bold text-zinc-200 hover:text-gold-light">
                            {r.session.activity.title}
                          </Link>
                          <p className="text-[10px] text-zinc-600">{r.session.title} · {formatDateAr(r.session.startsAt)}</p>
                        </td>
                        <td className="py-2.5 text-zinc-400">{REGISTRATION_STATUS_LABELS[r.status]}</td>
                        <td className="py-2.5 text-zinc-400">{REGISTRATION_SOURCE_LABELS[r.source]}</td>
                        <td className="py-2.5">
                          {(() => {
                          const present = r.attendance.some((a) => a.present);
                          const marked = r.attendance.length > 0;
                          return marked ? (
                            present ? (
                              <span className="flex items-center gap-1 font-bold text-gold-light"><CheckCircle2 className="h-3 w-3" /> حضر</span>
                            ) : (
                              <span className="flex items-center gap-1 font-bold text-red-300/70"><XCircle className="h-3 w-3" /> غائب</span>
                            )
                          ) : (
                            <span className="text-zinc-600">—</span>
                          );
                        })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* سجل النقاط */}
          <section className="rounded-3xl border border-white/[0.06] bg-surface p-5">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-zinc-100">
              <Zap className="h-4 w-4 text-gold/80" />
              سجل النقاط — {points} نقطة (مجموع الأحداث)
            </h2>
            {student.pointEvents.length === 0 ? (
              <p className="text-xs text-zinc-600">مفيش أحداث نقاط</p>
            ) : (
              <ul className="max-h-72 space-y-2 overflow-y-auto">
                {student.pointEvents.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-200">{e.reason}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-600">
                        <ScrollText className="h-3 w-3" />
                        {formatDateAr(e.createdAt)} · بواسطة {e.createdBy.email === student.email ? "نظام الحضور" : e.createdBy.email}
                        {e.session && ` · ${e.session.activity.title}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
                        e.points > 0 ? "border border-gold/30 bg-gold/[0.08] text-gold-light" : "border border-red-500/20 bg-red-500/[0.05] text-red-300"
                      }`}>
                        {e.points > 0 ? `+${e.points}` : e.points}
                      </span>
                      {canPoints && (
                        <>
                          <ReversePointEventButton eventId={e.id} points={e.points} studentName={student.profile?.fullName ?? student.email} />
                          <DeletePointEventButton eventId={e.id} studentName={student.profile?.fullName ?? student.email} />
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[10px] leading-5 text-zinc-600">
              لا تعديل مباشر على الرصيد — كل عملية لها سجل دائم، وعكس أي عملية يحدث بعملية معاكسة موثقة.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function formatStudentData(raw: string): string {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.join("، ") : String(v);
  } catch {
    return raw;
  }
}

function Info({ icon, label, value, ltr }: { icon: React.ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-bold text-zinc-500">
        <span className="text-gold/60">{icon}</span>
        {label}
      </span>
      <span dir={ltr ? "ltr" : "rtl"} className={`truncate text-xs font-bold text-zinc-200 ${ltr ? "text-start" : ""}`}>{value}</span>
    </li>
  );
}
