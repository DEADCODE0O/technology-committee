import "server-only";

// ═══════════════════════════════════════════════════════════════
//  مزوّد الرسائل القصيرة (SMS) — طبقة مجرّدة قابلة للتبديل
//
//  SMS_MODE=console (الافتراضي — مجاني تمامًا):
//    يُسجَّل الكود في سجل السيرفر فقط، والكود يظهر للطالب
//    في الواجهة مُعلَّمًا «وضع التطوير» ليكمل التوثيق محليًا.
//    مناسب للمعاينة ولحين ربط مزوّد حقيقي.
//
//  SMS_MODE=webhook (مزوّد مصري أو أي بوابة SMS):
//    POST { to, message } → SMS_WEBHOOK_URL
//    مع ترويسة Authorization: Bearer SMS_API_KEY
//    (يدعم أي بوابة SMS مصرية عبر غلاف webhook بسيط)
//
//  أرقام الهواتف مصرية دائمًا: 01[0125]xxxxxxxx
// ═══════════════════════════════════════════════════════════════

export type SmsSendResult = {
  ok: boolean;
  error?: string;
  /** true = لا مزوّد حقيقي — الكود سيظهر في الواجهة (وضع التطوير) */
  devMode: boolean;
};

export function isSmsDevMode(): boolean {
  const mode = (process.env.SMS_MODE || "console").toLowerCase();
  return mode !== "webhook" || !process.env.SMS_WEBHOOK_URL;
}

export async function sendSms(to: string, message: string): Promise<SmsSendResult> {
  if (isSmsDevMode()) {
    // وضع التطوير: تسجيل فقط — لا رسالة حقيقية تُرسل
    console.log(`[SMS:console] to=${to} :: ${message}`);
    return { ok: true, devMode: true };
  }

  try {
    const res = await fetch(process.env.SMS_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SMS_API_KEY
          ? { Authorization: `Bearer ${process.env.SMS_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        to,
        message,
        sender: process.env.SMS_SENDER || "TechCommittee",
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[SMS:webhook] HTTP ${res.status}`);
      return { ok: false, error: "تعذر إرسال الرسالة — حاول مرة أخرى بعد قليل", devMode: false };
    }
    return { ok: true, devMode: false };
  } catch (err) {
    console.error("[SMS:webhook] network error:", err);
    return { ok: false, error: "تعذر إرسال الرسالة — حاول مرة أخرى بعد قليل", devMode: false };
  }
}
