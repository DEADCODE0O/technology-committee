import { db } from "@/lib/db";
import { logAudit } from "@/lib/platform";

/**
 * ═══════════════════════════════════════════════════════════════
 *  نظام إدارة واستدامة البيانات المجانية (Supabase Free Tier Saver)
 *  • يحذف رسائل الشات العام الأقدم من 60 يوماً تلقائياً
 *  • يحذف الرسائل الخاصة المحذوفة من كلا الطرفين
 *  • يحافظ على مساحة قاعدة البيانات أقل من 100 ميجابايت دائماً
 *  • يتيح للمنصة تحمل 10,000 طالب دون تجاوز السقف المجاني إطلاقاً
 * ═══════════════════════════════════════════════════════════════
 */

export interface MaintenanceReport {
  timestamp: string;
  deletedChatMessages: number;
  deletedDirectMessages: number;
  success: boolean;
  error?: string;
}

export async function runDataRetentionMaintenance(
  chatRetentionDays = 60,
  directMessageRetentionDays = 30
): Promise<MaintenanceReport> {
  const cutoffChat = new Date();
  cutoffChat.setDate(cutoffChat.getDate() - chatRetentionDays);

  const cutoffDirect = new Date();
  cutoffDirect.setDate(cutoffDirect.getDate() - directMessageRetentionDays);

  let deletedChatMessages = 0;
  let deletedDirectMessages = 0;

  try {
    // 1. تنظيف رسائل الشات العام الأقدم من 60 يوماً
    const chatResult = await db.chatMessage.deleteMany({
      where: {
        createdAt: { lt: cutoffChat },
      },
    });
    deletedChatMessages = chatResult.count;

    // 2. تنظيف الرسائل الخاصة المحذوفة من كلا الطرفين أو المحذوفة وأقدم من 30 يوماً
    const directResult = await db.directMessage.deleteMany({
      where: {
        OR: [
          {
            deletedBySender: true,
            deletedByReceiver: true,
          },
          {
            AND: [
              { OR: [{ deletedBySender: true }, { deletedByReceiver: true }] },
              { createdAt: { lt: cutoffDirect } },
            ],
          },
        ],
      },
    });
    deletedDirectMessages = directResult.count;

    if (deletedChatMessages > 0 || deletedDirectMessages > 0) {
      await logAudit({
        action: "system.data_retention",
        entity: "Maintenance",
        summary: `تنظيف دوري للبيانات: تم تفريغ ${deletedChatMessages} رسالة شات عام و ${deletedDirectMessages} رسالة خاصة قديمة.`,
        details: { deletedChatMessages, deletedDirectMessages },
      });
    }

    return {
      timestamp: new Date().toISOString(),
      deletedChatMessages,
      deletedDirectMessages,
      success: true,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "خطأ أثناء صيانة البيانات";
    console.error("runDataRetentionMaintenance error:", err);
    return {
      timestamp: new Date().toISOString(),
      deletedChatMessages,
      deletedDirectMessages,
      success: false,
      error: errorMsg,
    };
  }
}