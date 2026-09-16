import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Google: ترقية الصورة المصغرة بأمان إلى دقة فائقة =s500-c
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+(-c)?$/i, "=s500-c");
  }
  // Facebook platform-lookaside: الحفاظ على التوقيع الرقمي (hash) لأن تعديل الأبعاد يُرجع 404
  if (url.includes("platform-lookaside.fbsbx.com") || url.includes("fbsbx.com")) {
    return url.replace(/height=500&width=500/i, "height=50&width=50");
  }
  return url;
}
