import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Google: ترقية الصورة المصغرة بأمان إلى دقة فائقة =s720-c
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+(-c)?$/i, "=s720-c");
  }
  // Facebook platform-lookaside: استخراج asid وطلب الصورة بدقة 720x720 فائقة الوضوح من Graph API
  if (url.includes("platform-lookaside.fbsbx.com") || url.includes("fbsbx.com")) {
    const match = url.match(/asid=(\d+)/);
    if (match && match[1]) {
      return `https://graph.facebook.com/${match[1]}/picture?width=720&height=720`;
    }
    return url.replace(/height=500&width=500/i, "height=50&width=50");
  }
  return url;
}
