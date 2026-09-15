// ═══════════════════════════════════════════════════════════════
//  بوابة البيانات الإلزامية — ما الذي يمنع الطالب من استخدام المنصة؟
//  • طلب بيانات إلزامي موجّه له ولم يُجب عليه بعد
//  • كود الطالب مطلوب لفرقته (من الإعدادات) ولم يسجّله بعد
//  تُستخدم في requireStudent (تحويل تلقائي) وفي صفحة البوابة نفسها
// ═══════════════════════════════════════════════════════════════

import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { getStudentCodeConfig } from "@/lib/platform";
import { findTargetedStudentIds, parseTarget } from "@/lib/targeting";
import { makeDataKey } from "@/lib/validation";

export type MandatoryDataRequest = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  fields: { id: string; label: string; type: string; options?: string[]; required?: boolean }[];
};

export type StudentGate = {
  /** الطالب مقيد — عليه إكمال بيانات قبل استخدام المنصة */
  blocked: boolean;
  /** كود الطالب مطلوب لفرقته وغير مسجل */
  needsStudentCode: boolean;
  codeHint: string;
  codePattern: string;
  /** طلبات البيانات الإلزامية غير المجابة */
  mandatoryRequests: MandatoryDataRequest[];
};

export async function getStudentGate(user: SessionUser): Promise<StudentGate> {
  const empty: StudentGate = {
    blocked: false,
    needsStudentCode: false,
    codeHint: "",
    codePattern: "",
    mandatoryRequests: [],
  };

  // الطلاب بدون ملف (مستخدمو Google الجدد) يعالجون عبر صفحة إكمال البيانات
  if (!user.profile) return empty;

  // 1) كود الطالب — مطلوب لفرقته وغير مسجل؟
  const [codeConfig, openRequests] = await Promise.all([
    getStudentCodeConfig(),
    db.dataRequest.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" } }),
  ]);
  const needsStudentCode =
    codeConfig.requiredGrades.includes(user.profile.grade) && !user.profile.studentCode;

  // 2) الطلبات الإلزامية الموجهة له (ضمن الموعد إن وُجد) وغير المجابة
  const now = new Date();
  const candidates = openRequests.filter(
    (r) =>
      r.mandatory &&
      (!r.deadline || new Date(r.deadline) >= now)
  );
  const mandatoryRequests: MandatoryDataRequest[] = [];
  if (candidates.length > 0) {
    const [answeredSet, savedRows] = await Promise.all([
      db.dataResponse.findMany({
        where: { userId: user.id, requestId: { in: candidates.map((c) => c.id) } },
        select: { requestId: true },
      }),
      // بيانات محفوظة من أي طلب سابق — تُحسب إجابة دائمًا:
      // مجرد ما يدخل الطالب المعلومة لا يُسأل عنها مرة أخرى
      db.studentData.findMany({ where: { userId: user.id }, select: { key: true } }),
    ]);
    const answered = new Set(answeredSet.map((a) => a.requestId));
    const savedKeys = new Set(savedRows.map((d) => d.key));
    for (const r of candidates) {
      if (answered.has(r.id)) continue;
      // مفتاح كل سؤال محفوظ عند الطالب من أي طلب سابق = مكتمل — لا يُسأل مجددًا
      try {
        const fields = JSON.parse(r.fields) as Array<{ key?: string; label: string }>;
        const covered = fields.length === 0 || fields.every((f) => savedKeys.has(f.key || makeDataKey(f.label)));
        if (covered) continue;
      } catch {
        // تعطّل تحليل الحقول — نتعامل معه كطلب غير مجاب
      }
      const ids = await findTargetedStudentIds(parseTarget(r.target));
      if (ids.includes(user.id)) {
        mandatoryRequests.push({
          id: r.id,
          title: r.title,
          description: r.description,
          deadline: r.deadline,
          fields: JSON.parse(r.fields) as MandatoryDataRequest["fields"],
        });
      }
    }
  }

  return {
    blocked: needsStudentCode || mandatoryRequests.length > 0,
    needsStudentCode,
    codeHint: codeConfig.hint,
    codePattern: codeConfig.pattern,
    mandatoryRequests,
  };
}
