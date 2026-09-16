import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanAvatarUrl(url: string | null | undefined): string | null {
  if (!url || url === "INITIALS" || url.trim() === "") return null;
  // Google: ترقية الصورة المصغرة بأمان إلى دقة فائقة =s720-c
  if (url.includes("googleusercontent.com")) {
    return url.replace(/=s\d+(-c)?$/i, "=s720-c");
  }
  // Facebook platform-lookaside: الرابط موقع بتوقيع رقمي (hash) من فيسبوك ويجب تركه دون تعديل
  if (url.includes("platform-lookaside.fbsbx.com") || url.includes("fbsbx.com")) {
    return url;
  }
  return url;
}
