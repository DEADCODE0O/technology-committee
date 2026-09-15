"use server";

// ═══════════════════════════════════════════════════════════════
//  الإشعارات — إرسال موجه للجمهور + CTA + تثبيت
//  وإجراءات الطالب: قراءة / إغفال البنر
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser, requireStudentAction } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { parseTarget, findTargetedStudentIds, DEFAULT_TARGET, type StudentTarget } from "@/lib/targeting";
import { detectLinkType, safeExternalUrl } from "@/lib/links";
import {
  markNotificationRead, markAllNotificationsRead, dismissNotification,
} from "@/lib/notifications";

// ─── إدارة: إرسال إشعار ──────────────────────────────────────

export type NotificationButtonInput = {
  label: string;
  url: string;
  newTab?: boolean;
};

export type NotificationInput = {
  type: string; // IMPORTANT | ANNOUNCEMENT | TASK | INFO
  pinned: boolean;
  title: string;
  body?: string;
  // أزرار متعددة (حتى 4) — عند إرسالها تُخزن JSON وتُهمل حقول الزر الواحد القديمة
  buttons?: NotificationButtonInput[];
  // صورة داخل الإشعار: رابط درايف «أي شخص لديه الرابط» أو أي رابط أو رابط رفع على السيرفر
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaNewTab?: boolean;
  expiresAt?: string; // ISO اختياري
  target: Partial<StudentTarget>;
};

// تنظيف وتحقق الأزرار — يُرجع خطأ عربيًا أو البيانات الجاهزة للحفظ
function sanitizeButtons(input: NotificationInput): { error?: string; buttonsJson: string | null; cta: { ctaLabel: string | null; ctaUrl: string | null; ctaNewTab: boolean; linkType: string | null } } {
  const raw = (input.buttons ?? []).filter((b) => (b?.label ?? "").trim() || (b?.url ?? "").trim());
  if (raw.length === 0) {
    // توافق: زر واحد بالحقول القديمة
    const ctaLabel = (input.ctaLabel || "").trim() || null;
    const ctaUrlRaw = (input.ctaUrl || "").trim() || null;
    if ((ctaLabel && !ctaUrlRaw) || (!ctaLabel && ctaUrlRaw)) {
      return { error: "زر الإجراء يحتاج عنوانًا ورابطًا معًا (أو اتركهما فارغين)", buttonsJson: null, cta: { ctaLabel, ctaUrl: null, ctaNewTab: input.ctaNewTab ?? true, linkType: null } };
    }
    const ctaUrl = ctaUrlRaw ? safeExternalUrl(ctaUrlRaw) : null;
    if (ctaUrl === "#") return { error: "رابط الزر غير صالح", buttonsJson: null, cta: { ctaLabel, ctaUrl: null, ctaNewTab: input.ctaNewTab ?? true, linkType: null } };
    return { buttonsJson: null, cta: { ctaLabel, ctaUrl, ctaNewTab: input.ctaNewTab ?? true, linkType: ctaUrl ? detectLinkType(ctaUrlRaw) : null } };
  }
  if (raw.length > 4) return { error: "أقصى عدد للأزرار 4", buttonsJson: null, cta: { ctaLabel: null, ctaUrl: null, ctaNewTab: true, linkType: null } };
  const clean: NotificationButtonInput[] = [];
  for (const b of raw) {
    const label = (b.label ?? "").trim();
    const urlRaw = (b.url ?? "").trim();
    if (!label && !urlRaw) continue;
    if (label.length < 2) return { error: "نص الزر حرفان على الأقل", buttonsJson: null, cta: { ctaLabel: null, ctaUrl: null, ctaNewTab: true, linkType: null } };
    if (!urlRaw) return { error: "كل زر يحتاج رابطًا", buttonsJson: null, cta: { ctaLabel: null, ctaUrl: null, ctaNewTab: true, linkType: null } };
    const url = safeExternalUrl(urlRaw);
    if (url === "#") return { error: `رابط الزر «${label}» غير صالح`, buttonsJson: null, cta: { ctaLabel: null, ctaUrl: null, ctaNewTab: true, linkType: null } };
    clean.push({ label, url, newTab: b.newTab !== false });
  }
  // مزامنة الحقول القديمة بأول زر (توافق + سجل التدقيق)
  const first = clean[0];
  return {
    buttonsJson: JSON.stringify(clean),
    cta: { ctaLabel: first.label, ctaUrl: first.url, ctaNewTab: first.newTab !== false, linkType: detectLinkType(first.url) },
  };
}

export async function sendNotification(
  input: NotificationInput
): Promise<{ ok: boolean; id?: string; error?: string; reached?: number }> {
  try {
    const admin = await requireActionUser(MODULES.NOTIFICATIONS, "manage");

    const title = (input.title || "").trim();
    if (title.length < 3) return { ok: false, error: "عنوان الإشعار قصير جدًا" };
    if (!["IMPORTANT", "ANNOUNCEMENT", "TASK", "INFO"].includes(input.type)) {
      return { ok: false, error: "نوع الإشعار غير صحيح" };
    }

    // الأزرار المتعددة + الصورة
    const btn = sanitizeButtons(input);
    if (btn.error) return { ok: false, error: btn.error };
    const { buttonsJson, cta } = btn;
    const ctaLabel = cta.ctaLabel;
    const ctaUrl = cta.ctaUrl;
    const linkType = cta.linkType;
    const imageUrlRaw = (input.imageUrl || "").trim() || null;
    const imageUrl = imageUrlRaw ? safeExternalUrl(imageUrlRaw) : null;
    if (imageUrlRaw && imageUrl === "#") return { ok: false, error: "رابط الصورة غير صالح" };

    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
      if (isNaN(expiresAt.getTime())) return { ok: false, error: "تاريخ الانتهاء غير صحيح" };
    }

    // التحقق من الجمهور قبل الإرسال
    const target: StudentTarget = { ...DEFAULT_TARGET, ...parseTarget(JSON.stringify(input.target)) };
    const reached = await findTargetedStudentIds(target);
    if (reached.length === 0) {
      return { ok: false, error: "لا يوجد طلاب مطابقون لهذا الاستهداف — راجع الفلاتر" };
    }

    const notification = await db.notification.create({
      data: {
        type: input.type,
        pinned: !!input.pinned || input.type === "IMPORTANT", // «مهم» يثبت تلقائيًا
        title,
        body: (input.body || "").trim() || null,
        buttons: buttonsJson,
        imageUrl,
        ctaLabel,
        ctaUrl,
        ctaNewTab: cta.ctaNewTab,
        linkType,
        target: JSON.stringify(target),
        createdById: admin.id,
        expiresAt,
      },
    });

    await logAudit({
      actor: admin,
      action: "NOTIFICATION_SENT",
      entity: "NOTIFICATION",
      entityId: notification.id,
      summary: `إشعار ${input.pinned || input.type === "IMPORTANT" ? "مهم ومثبت" : ""} «${title}» → ${reached.length} طالبًا${buttonsJson ? ` مع ${JSON.parse(buttonsJson).length} زر` : ctaLabel ? ` مع زر «${ctaLabel}»` : ""}${imageUrl ? " مع صورة" : ""}`,
      details: {
        before: null,
        notification: {
          type: input.type, pinned: input.pinned, title, body: notification.body,
          buttons: buttonsJson ? JSON.parse(buttonsJson) : null, imageUrl,
          ctaLabel, ctaUrl, ctaNewTab: notification.ctaNewTab, linkType,
          target, expiresAt: expiresAt?.toISOString() ?? null,
        },
        reached,
      },
    });

    revalidatePath("/admin/notifications");
    revalidatePath("/panel");
    revalidatePath("/notifications");
    return { ok: true, id: notification.id, reached: reached.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// معاينة عدد الواصلين قبل الإرسال (بدون حفظ)
export async function previewNotificationTarget(
  target: Partial<StudentTarget>
): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    await requireActionUser(MODULES.NOTIFICATIONS, "view");
    const clean: StudentTarget = { ...DEFAULT_TARGET, ...parseTarget(JSON.stringify(target)) };
    const ids = await findTargetedStudentIds(clean);
    return { ok: true, count: ids.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteNotification(notificationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.NOTIFICATIONS, "manage");
    const notification = await db.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return { ok: false, error: "الإشعار غير موجود" };

    // حذف القراءات أولًا (قيود المفاتياح الخارجية) ثم الإشعار — في معاملة واحدة
    await db.$transaction([
      db.notificationRead.deleteMany({ where: { notificationId } }),
      db.notification.delete({ where: { id: notificationId } }),
    ]);
    await logAudit({
      actor: admin,
      action: "NOTIFICATION_DELETED",
      entity: "NOTIFICATION",
      entityId: notificationId,
      summary: `حذف الإشعار «${notification.title}»`,
      details: {
        before: {
          type: notification.type, pinned: notification.pinned, title: notification.title,
          body: notification.body, buttons: notification.buttons, imageUrl: notification.imageUrl,
          ctaLabel: notification.ctaLabel, ctaUrl: notification.ctaUrl,
          target: notification.target, expiresAt: notification.expiresAt?.toISOString() ?? null,
        },
      },
    });
    revalidatePath("/admin/notifications");
    revalidatePath("/panel");
    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── إدارة: تعديل إشعار قائم ────────────────────────────

export async function updateNotification(
  notificationId: string,
  input: NotificationInput
): Promise<{ ok: boolean; error?: string; reached?: number }> {
  try {
    const admin = await requireActionUser(MODULES.NOTIFICATIONS, "manage");

    const existing = await db.notification.findUnique({ where: { id: notificationId } });
    if (!existing) return { ok: false, error: "الإشعار غير موجود" };

    const title = (input.title || "").trim();
    if (title.length < 3) return { ok: false, error: "عنوان الإشعار قصير جدًا" };
    if (!["IMPORTANT", "ANNOUNCEMENT", "TASK", "INFO"].includes(input.type)) {
      return { ok: false, error: "نوع الإشعار غير صحيح" };
    }

    // الأزرار المتعددة + الصورة
    const btn = sanitizeButtons(input);
    if (btn.error) return { ok: false, error: btn.error };
    const { buttonsJson, cta } = btn;
    const ctaLabel = cta.ctaLabel;
    const ctaUrl = cta.ctaUrl;
    const linkType = cta.linkType;
    const imageUrlRaw = (input.imageUrl || "").trim() || null;
    const imageUrl = imageUrlRaw ? safeExternalUrl(imageUrlRaw) : null;
    if (imageUrlRaw && imageUrl === "#") return { ok: false, error: "رابط الصورة غير صالح" };

    let expiresAt: Date | null = null;
    if (input.expiresAt) {
      expiresAt = new Date(input.expiresAt);
      if (isNaN(expiresAt.getTime())) return { ok: false, error: "تاريخ الانتهاء غير صحيح" };
    }

    // التحقق من الجمهور الجديد
    const target: StudentTarget = { ...DEFAULT_TARGET, ...parseTarget(JSON.stringify(input.target)) };
    const reached = await findTargetedStudentIds(target);
    if (reached.length === 0) {
      return { ok: false, error: "لا يوجد طلاب مطابقون لهذا الاستهداف — راجع الفلاتر" };
    }

    const pinned = !!input.pinned || input.type === "IMPORTANT"; // «مهم» يثبت تلقائيًا

    await db.notification.update({
      where: { id: notificationId },
      data: {
        type: input.type,
        pinned,
        title,
        body: (input.body || "").trim() || null,
        buttons: buttonsJson,
        imageUrl,
        ctaLabel,
        ctaUrl,
        ctaNewTab: cta.ctaNewTab,
        linkType,
        target: JSON.stringify(target),
        expiresAt,
      },
    });

    await logAudit({
      actor: admin,
      action: "NOTIFICATION_UPDATED",
      entity: "NOTIFICATION",
      entityId: notificationId,
      summary: `تعديل الإشعار «${title}»`,
      details: {
        before: {
          type: existing.type, pinned: existing.pinned, title: existing.title,
          body: existing.body, buttons: existing.buttons, imageUrl: existing.imageUrl,
          ctaLabel: existing.ctaLabel, ctaUrl: existing.ctaUrl,
          target: existing.target, expiresAt: existing.expiresAt?.toISOString() ?? null,
        },
        after: {
          type: input.type, pinned, title,
          body: (input.body || "").trim() || null,
          buttons: buttonsJson ? JSON.parse(buttonsJson) : null, imageUrl,
          ctaLabel, ctaUrl,
          target, expiresAt: expiresAt?.toISOString() ?? null,
        },
        reached,
      },
    });

    revalidatePath("/admin/notifications");
    revalidatePath("/panel");
    revalidatePath("/notifications");
    return { ok: true, reached: reached.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// بيانات إشعار واحد للتعديل (للأدمن)
export async function getNotificationForEdit(
  notificationId: string
): Promise<{ ok: boolean; notification?: NotificationInput & { createdAt: string; buttons?: NotificationButtonInput[] }; error?: string }> {
  try {
    await requireActionUser(MODULES.NOTIFICATIONS, "view");
    const n = await db.notification.findUnique({ where: { id: notificationId } });
    if (!n) return { ok: false, error: "الإشعار غير موجود" };
    // الأزرار: من JSON إن وُجد، وإلا الزر القديم كزر واحد
    let editButtons: NotificationButtonInput[] = [];
    if (n.buttons) {
      try {
        const arr = JSON.parse(n.buttons) as NotificationButtonInput[];
        if (Array.isArray(arr)) editButtons = arr.filter((b) => b?.label && b?.url);
      } catch { /* ignore */ }
    } else if (n.ctaLabel && n.ctaUrl) {
      editButtons = [{ label: n.ctaLabel, url: n.ctaUrl, newTab: n.ctaNewTab }];
    }
    return {
      ok: true,
      notification: {
        type: n.type,
        pinned: n.pinned,
        title: n.title,
        body: n.body ?? "",
        buttons: editButtons,
        imageUrl: n.imageUrl ?? "",
        ctaLabel: n.ctaLabel ?? "",
        ctaUrl: n.ctaUrl ?? "",
        ctaNewTab: n.ctaNewTab,
        expiresAt: n.expiresAt ? n.expiresAt.toISOString().slice(0, 16) : "",
        target: parseTarget(n.target),
        createdAt: n.createdAt.toISOString(),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// ─── الطالب: قراءة وإغفال ────────────────────────────────────

export async function studentMarkNotificationRead(notificationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await markNotificationRead(user.id, notificationId);
    revalidatePath("/notifications");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function studentMarkAllRead(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await markAllNotificationsRead(user.id, ids.filter((i) => typeof i === "string"));
    revalidatePath("/notifications");
    revalidatePath("/panel");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

// «تم» على البنر — يختفي البنر ويبقى الإشعار في المركز
export async function studentDismissNotification(notificationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireStudentAction();
    await dismissNotification(user.id, notificationId);
    revalidatePath("/panel");
    revalidatePath("/notifications");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
