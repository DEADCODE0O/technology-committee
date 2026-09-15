// أدوات تواريخ مشتركة (سيرفر + عميل) — بلا تبعيات

/** تحويل تاريخ إلى صيغة datetime-local لإدخال النماذج */
export function toLocalInput(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
