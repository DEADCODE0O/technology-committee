// ═══════════════════════════════════════════════════════════════
//  الوسائط — عرض «موفر-واعٍ» بسياسات صريحة
//  يوتيوب → المشغّل الرسمي المدمج (بدون إخفاء العلامة)
//  تليجرام → رابط خارجي (لا نزيّف مشغّلًا خاصًا حوله)
//  ملف مباشر/تخزيننا → مشغل HTML5 بهويتنا
//  درايف → معاينة/تنزيل عبر الرابط الرسمي
// ═══════════════════════════════════════════════════════════════

export type MediaProvider =
  | "YOUTUBE"
  | "TELEGRAM"
  | "GOOGLE_DRIVE"
  | "DIRECT_URL"
  | "SUPABASE"
  | "OTHER";

export type MediaKind = "VIDEO" | "IMAGE" | "AUDIO" | "EMBED_PAGE" | "FILE" | "LINK";

export type MediaPlan =
  | { kind: "YOUTUBE_EMBED"; videoId: string; provider: "YOUTUBE"; originalUrl: string }
  | { kind: "HTML5_VIDEO"; src: string; provider: MediaProvider; originalUrl: string }
  | { kind: "HTML5_AUDIO"; src: string; provider: MediaProvider; originalUrl: string }
  | { kind: "EXTERNAL_LINK"; provider: MediaProvider; originalUrl: string; isDrive: boolean }
  | { kind: "UNKNOWN"; provider: "OTHER"; originalUrl: string };

/** استخراج معرف فيديو يوتيوب من أي صيغة روابطه الشائعة */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1).split("/")[0] || null;
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/);
      if (m) return m[2];
    }
  } catch {
    /* رابط غير صالح */
  }
  return null;
}

/** اكتشاف المزود من الرابط — لا نطلب من الأدمن تخمينه */
export function detectMediaProvider(url: string): MediaProvider {
  if (extractYouTubeId(url)) return "YOUTUBE";
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes("drive.google.com") || h.includes("docs.google.com")) return "GOOGLE_DRIVE";
    if (h.includes("t.me") || h.includes("telegram.me")) return "TELEGRAM";
    if (h.endsWith(".mp4") || h.endsWith(".webm") || h.endsWith(".mov")) return "DIRECT_URL";
    if (u.pathname.startsWith("/api/uploads/") || h.includes("supabase.co")) return "SUPABASE";
    if (h.endsWith(".mp3") || h.endsWith(".m4a") || h.endsWith(".wav")) return "DIRECT_URL";
  } catch {
    /* غير صالح */
  }
  return "OTHER";
}

/** خطة العرض — يستهلكها مكون <MediaFrame> في الواجهة */
export function planMedia(url: string, explicitProvider?: string | null): MediaPlan {
  const provider = (explicitProvider as MediaProvider) ?? detectMediaProvider(url);

  if (provider === "YOUTUBE" || extractYouTubeId(url)) {
    const id = extractYouTubeId(url);
    if (id) return { kind: "YOUTUBE_EMBED", videoId: id, provider: "YOUTUBE", originalUrl: url };
  }
  if (provider === "TELEGRAM") {
    // تليجرام مصدر خارجي — نعرض رابطه الرسمي دون تزييف مشغّل
    return { kind: "EXTERNAL_LINK", provider: "TELEGRAM", originalUrl: url, isDrive: false };
  }
  if (provider === "GOOGLE_DRIVE") {
    return { kind: "EXTERNAL_LINK", provider: "GOOGLE_DRIVE", originalUrl: url, isDrive: true };
  }
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    // ملف مباشر أو من تخزيننا → HTML5 بهويتنا (White-label مسموح)
    return { kind: "HTML5_VIDEO", src: url, provider, originalUrl: url };
  }
  if (lower.endsWith(".mp3") || lower.endsWith(".m4a") || lower.endsWith(".wav")) {
    return { kind: "HTML5_AUDIO", src: url, provider, originalUrl: url };
  }
  return { kind: "EXTERNAL_LINK", provider, originalUrl: url, isDrive: false };
}

/** الرابط بعد تمريره عبر بروكسي الصور (للصور الخارجية فقط) */
export function proxiedImage(url: string): string {
  if (!url) return url;
  if (url.startsWith("/")) return url; // محلي
  return `/api/img?u=${encodeURIComponent(url)}`;
}
