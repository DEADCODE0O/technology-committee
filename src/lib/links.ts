// ═══════════════════════════════════════════════════════════════
//  الروابط: كشف النوع تلقائيًا (واتساب/تليجرام/درايف/...)
//  + تحويل روابط جوجل درايف إلى صور معاينة قابلة للتضمين
//  يعمل في السيرفر والواجهة معًا (نقي بلا تبعيات)
// ═══════════════════════════════════════════════════════════════

export type LinkType = "WHATSAPP" | "TELEGRAM" | "DRIVE" | "FORM" | "GITHUB" | "YOUTUBE" | "LINK";

// كشف نوع الرابط من شكله — للأيقونة والتسمية في الواجهة
export function detectLinkType(url: string | null | undefined): LinkType {
  const u = (url || "").trim().toLowerCase();
  if (!u) return "LINK";
  if (u.includes("chat.whatsapp.com") || u.includes("wa.me") || u.includes("whatsapp.com")) return "WHATSAPP";
  if (u.includes("t.me") || u.includes("telegram")) return "TELEGRAM";
  if (u.includes("drive.google.com") || u.includes("docs.google.com")) return "DRIVE";
  if (u.includes("forms.gle") || u.includes("docs.google.com/forms")) return "FORM";
  if (u.includes("github.com")) return "GITHUB";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "YOUTUBE";
  return "LINK";
}

// تأمين الروابط: المسارات المحلية تبقى كما هي — وبدون بروتوكول نضيف https — ونمنع javascript: وأخواتها
export function safeExternalUrl(url: string): string {
  const u = (url || "").trim();
  if (!u) return "#";
  // مسار محلي (يرفع على السيرفر أو أصل داخلي) — يُخدم من نفس النطاق كما هو
  if (u.startsWith("/")) {
    if (!u.startsWith("//") && !u.startsWith("/\\") && !u.includes("\\")) {
      return u;
    }
    return "#";
  }
  if (/^(https?:)?\/\//i.test(u) && !u.toLowerCase().startsWith("javascript:")) {
    if (u.includes("\\")) return "#";
    return u.startsWith("//") ? `https:${u}` : u;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return "#"; // أي بروتوكول غريب → تعطيل
  // رابط عادي بدون بروتوكول (مثل example.com/path)
  if (!u.includes("\\") && /^[\w.-]+\.[a-z]{2,}/i.test(u)) {
    return `https://${u}`;
  }
  return "#";
}

// ─── جوجل درايف ──────────────────────────────────────────────

// استخراج معرف الملف من أي صيغة رابط درايف شائعة
export function driveFileId(url: string): string | null {
  const u = (url || "").trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([a-zA-Z0-9_-]{10,})/,
    /docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/([a-zA-Z0-9_-]{10,})/,
  ];
  for (const p of patterns) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}

export function isDriveLink(url: string | null | undefined): boolean {
  return detectLinkType(url) === "DRIVE";
}

export function isDriveFolder(url: string): boolean {
  return /drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders|folderview)/.test((url || "").trim());
}

// رابط صورة قابل للتضمين <img> من رابط مشاركة درايف (الملف يجب أن يكون «أي شخص لديه الرابط»)
// إن لم يكن الرابط درايف يُعاد كما هو
export function driveImageUrl(url: string, size = 1200): string {
  const id = driveFileId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
  return safeExternalUrl(url);
}

// رابط المعاينة داخل إطار (iframe) للملفات المكتبية — أو الرابط نفسه للصور
export function drivePreviewUrl(url: string): string {
  const id = driveFileId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return safeExternalUrl(url);
}

// هل يمكن تضمين الرابط مباشرة كصورة؟ (مكتبة المشروع أو درايف بصيغة صورة)
export function isEmbeddableImage(url: string | null | undefined): boolean {
  const u = (url || "").trim();
  if (!u) return false;
  if (u.startsWith("/")) return true; // أصول محلية
  if (isDriveLink(u)) return !!driveFileId(u); // درايف → نمرر عبر thumbnail
  return /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(u);
}

// مساعد مشترك: عدة مصادر صورة (أصل محلي أو درايف أو خارجي)
// v4: الصور الخارجية تمر عبر بروكسي /api/img — يحل نهائيًا مشكلة صور درايف
// (المتصفح يطلبها من نفس النطاق والسيرفر يجلبها ويبثّها)
export function resolveImageSrc(url: string | null | undefined): string | null {
  const u = (url || "").trim();
  if (!u) return null;
  if (u.startsWith("/")) return u; // أصل محلي (رفع على السيرفر)
  if (/^https?:\/\//i.test(u)) return `/api/img?u=${encodeURIComponent(u)}`;
  return u;
}

// نسخة للسيرفر فقط: تعيد رابط الجلب المباشر (اختياري للاستخدام الداخلي)
export function proxiedImageUrl(url: string | null | undefined): string | null {
  return resolveImageSrc(url);
}

// ─── أزرار الإشعارات (متعددة) ────────────────────────────────

export type NotificationButton = {
  label: string;
  url: string;
  newTab: boolean;
  linkType: string;
};

// قراءة أزرار الإشعار من صيغة JSON المخزنة + توافق الزر الواحد القديم (ctaLabel/ctaUrl)
// نقية بلا تبعيات — تعمل في السيرفر والواجهة
export function parseNotificationButtons(
  raw: string | null | undefined,
  legacy?: { ctaLabel?: string | null; ctaUrl?: string | null; ctaNewTab?: boolean | null }
): NotificationButton[] {
  const out: NotificationButton[] = [];
  if (raw) {
    try {
      const arr = JSON.parse(raw) as { label?: string; url?: string; newTab?: boolean }[];
      if (Array.isArray(arr)) {
        for (const b of arr.slice(0, 4)) {
          const label = (b?.label ?? "").trim();
          const url = (b?.url ?? "").trim();
          if (!label || !url) continue;
          const safe = safeExternalUrl(url);
          if (safe === "#") continue; // بروتوكول غريب — نتجاهله
          out.push({ label, url: safe, newTab: b.newTab !== false, linkType: detectLinkType(url) });
        }
      }
    } catch {
      // JSON تالف — نتجاهل ونسقط للتوافق القديم
    }
  }
  if (out.length === 0 && legacy?.ctaLabel && legacy?.ctaUrl) {
    const safe = safeExternalUrl(legacy.ctaUrl);
    if (safe !== "#") {
      out.push({
        label: legacy.ctaLabel,
        url: safe,
        newTab: legacy.ctaNewTab !== false,
        linkType: detectLinkType(legacy.ctaUrl),
      });
    }
  }
  return out.slice(0, 4);
}
