// ═══════════════════════════════════════════════════════════════
//  مساعدات المهام — تحليل pool/links وحالة التكليف (سيرفر + عميل)
// ═══════════════════════════════════════════════════════════════

export type TaskVariant = { title: string; description?: string };
export type ExternalLink = { label: string; url: string; newTab?: boolean };

// قراءة بدائل المهمة (pool) بأمان — تُعاد دائمًا كمصفوفة
export function parseTaskPool(raw: string | null | undefined): TaskVariant[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p === "object" && typeof p.title === "string" && p.title.trim())
      .map((p) => ({ title: p.title.trim(), description: typeof p.description === "string" ? p.description : undefined }));
  } catch {
    return [];
  }
}

// قراءة الروابط الخارجية الموصوفة بأمان
export function parseExternalLinks(raw: string | null | undefined): ExternalLink[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p) => p && typeof p === "object" && typeof p.label === "string" && typeof p.url === "string"
      )
      .slice(0, 8)
      .map((p) => ({
        label: String(p.label).slice(0, 60),
        url: String(p.url),
        newTab: p.newTab !== false,
      }));
  } catch {
    return [];
  }
}

// حالة التكليف للعرض — مشتقة دائمًا
export function taskAssignmentDisplay(
  assignment: { status: string },
  submission?: { status: string; late: boolean; score: number | null } | null
): { label: string; tone: "gold" | "green" | "red" | "muted" } {
  if (submission?.status === "EVALUATED") {
    return { label: submission.late ? "قُيِّمت (متأخرة)" : "قُيِّمت", tone: "green" };
  }
  if (submission?.status === "RETURNED") {
    return { label: "أُعيدت للتعديل — سلّم مرة أخرى", tone: "red" };
  }
  if (submission) {
    return { label: submission.late ? "سلّمت (متأخرة) — بانتظار التقييم" : "سلّمت — بانتظار التقييم", tone: "gold" };
  }
  return { label: "بانتظار تسليمك", tone: "muted" };
}

// هل التسليم متاح الآن؟
export function submissionWindow(
  dueAt: Date | string | null
): { open: boolean; late: boolean; message?: string } {
  if (!dueAt) return { open: true, late: false };
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (now <= due) return { open: true, late: false };
  return { open: true, late: true, message: "تجاوزت الموعد — يُحسب التسليم متأخرًا" };
}
