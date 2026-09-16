// أدوات تواريخ موحدة للقاهرة ومصر (سيرفر + عميل) — بلا تبعيات
export const CAIRO_TZ = "Africa/Cairo";

/** حساب إزاحة توقيت القاهرة بدقة لأي تاريخ (مراعاة التوقيت الصيفي +03:00 والشتوي +02:00) */
export function getCairoOffset(dateStr: string): string {
  try {
    const approx = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: CAIRO_TZ,
      timeZoneName: "shortOffset",
    });
    const parts = dtf.formatToParts(approx);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+3";
    const m = tz.match(/GMT([+-]\d+)(?::(\d+))?/);
    if (!m) return "+03:00";
    const sign = m[1].startsWith("-") ? "-" : "+";
    const hours = Math.abs(parseInt(m[1], 10)).toString().padStart(2, "0");
    const mins = (m[2] || "00").padStart(2, "0");
    return `${sign}${hours}:${mins}`;
  } catch {
    return "+03:00";
  }
}

/** تحويل تاريخ (كائن Date أو نص ISO) إلى صيغة datetime-local بتوقيت القاهرة دائمًا */
export function toLocalInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";

  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAIRO_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = dtf.formatToParts(dateObj);
    const get = (t: string) => parts.find((p) => p.type === t)?.value;
    const y = get("year");
    const m = get("month");
    const day = get("day");
    const h = get("hour");
    const min = get("minute");
    if (y && m && day && h && min) {
      return `${y}-${m}-${day}T${h}:${min}`;
    }
  } catch {
    // fallback
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
}

/** تحويل مدخل datetime-local من المتصفح إلى نص ISO UTC صريح ينتهي بـ Z وفق توقيت القاهرة */
export function toUtcIso(v: string | null | undefined): string | undefined {
  if (!v || typeof v !== "string" || !v.trim()) return undefined;
  const trimmed = v.trim();
  // إذا كانت تحتوي على Z أو offset صريح (+XX:XX) فهي بالأساس ISO
  if (trimmed.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  }

  // إذا كانت صيغة datetime-local مجردة (مثل 2026-09-17T01:12)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const offset = getCairoOffset(trimmed);
    const d = new Date(`${trimmed}${offset}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * تحليل تاريخ بأمان على السيرفر، مع ربط المدخلات الخالية من التوقيت بتوقيت القاهرة دائمًا.
 * يمنع انزياح التوقيت (+3 ساعات) عند تشغيل السيرفر على Vercel (UTC).
 */
export function parseDateInput(v?: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string" || !v.trim()) return null;
  const trimmed = v.trim();

  // إذا كانت تحتوي على Z أو offset صريح
  if (trimmed.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // إذا كانت صيغة datetime-local مجردة (مثل 2026-09-17T01:12)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const offset = getCairoOffset(trimmed);
    const withOffset = new Date(`${trimmed}${offset}`);
    if (!isNaN(withOffset.getTime())) return withOffset;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** تنسيق عرض موحد للتاريخ والوقت بتوقيت القاهرة (ar-EG) يمنع Hydration mismatch على Vercel */
export function formatCairoDate(
  d: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!d) return "";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: CAIRO_TZ,
    ...options,
  }).format(dateObj);
}

