"use server";

// ═══════════════════════════════════════════════════════════════
//  مكتبة روابط جوجل درايف — مرفقات قابلة لإعادة الاستخدام
//  ترفعها مرة من حسابك وتشاركها «أي شخص لديه الرابط» ثم تستخدمها
//  في الإشعارات (CTA) والمحاضرات (مواد) وصور الأنشطة
// ═══════════════════════════════════════════════════════════════

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireActionUser } from "@/lib/auth";
import { logAudit } from "@/lib/platform";
import { MODULES } from "@/lib/permissions";
import { safeExternalUrl, detectLinkType, isDriveFolder } from "@/lib/links";

export type DriveAssetInput = {
  id?: string;
  title: string;
  url: string;
  kind?: string;
  note?: string;
};

function guessKind(url: string, explicit?: string): string {
  if (explicit && ["FILE", "IMAGE", "VIDEO", "FOLDER", "DOC", "SHEET", "LINK"].includes(explicit)) return explicit;
  const u = (url || "").toLowerCase();
  if (isDriveFolder(url)) return "FOLDER";
  if (detectLinkType(url) === "DRIVE") {
    if (/docs\.google\.com\/spreadsheets/.test(u)) return "SHEET";
    if (/docs\.google\.com\/document/.test(u)) return "DOC";
    if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(u)) return "IMAGE";
    if (/\.(mp4|mov|webm|avi)(\?|$)/.test(u)) return "VIDEO";
    return "FILE";
  }
  if (/\.(png|jpe?g|webp|gif)(\?|$)/.test(u)) return "IMAGE";
  if (/\.(mp4|mov|webm|avi)(\?|$)/.test(u)) return "VIDEO";
  return "LINK";
}

export async function saveDriveAsset(input: DriveAssetInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DRIVE, "manage");
    const title = (input.title || "").trim();
    const urlRaw = (input.url || "").trim();
    if (title.length < 2) return { ok: false, error: "عنوان المرفق قصير جدًا" };
    if (!urlRaw) return { ok: false, error: "الرابط مطلوب" };
    if (!/^https?:\/\//i.test(urlRaw) && !/^[\w.-]+\.[a-z]{2,}/i.test(urlRaw)) {
      return { ok: false, error: "رابط غير صحيح — مثال: https://drive.google.com/file/d/..." };
    }
    const url = safeExternalUrl(urlRaw);
    const kind = guessKind(url, input.kind);

    const data = {
      title,
      url,
      kind,
      note: (input.note || "").trim() || null,
    };

    if (input.id) {
      const existing = await db.driveAsset.findUnique({ where: { id: input.id } });
      if (!existing) return { ok: false, error: "المرفق غير موجود" };
      await db.driveAsset.update({ where: { id: input.id }, data });
      await logAudit({
        actor: admin,
        action: "DRIVE_ASSET_UPDATED",
        entity: "DRIVE_ASSET",
        entityId: input.id,
        summary: `تعديل مرفق «${title}»`,
        details: { before: { title: existing.title, url: existing.url, kind: existing.kind, note: existing.note } },
      });
      revalidatePath("/admin/drive");
      return { ok: true, id: input.id };
    }
    const asset = await db.driveAsset.create({ data: { ...data, createdById: admin.id } });
    await logAudit({
      actor: admin,
      action: "DRIVE_ASSET_CREATED",
      entity: "DRIVE_ASSET",
      entityId: asset.id,
      summary: `إضافة مرفق «${title}» (${kind})`,
    });
    revalidatePath("/admin/drive");
    return { ok: true, id: asset.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

export async function deleteDriveAsset(assetId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireActionUser(MODULES.DRIVE, "manage");
    const asset = await db.driveAsset.findUnique({ where: { id: assetId } });
    if (!asset) return { ok: false, error: "المرفق غير موجود" };
    await db.driveAsset.delete({ where: { id: assetId } });
    await logAudit({
      actor: admin,
      action: "DRIVE_ASSET_DELETED",
      entity: "DRIVE_ASSET",
      entityId: assetId,
      summary: `حذف مرفق «${asset.title}»`,
      details: { before: { title: asset.title, url: asset.url, kind: asset.kind, note: asset.note } },
    });
    revalidatePath("/admin/drive");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}
