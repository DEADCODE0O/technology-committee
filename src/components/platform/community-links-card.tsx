import { Lock } from "lucide-react";

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function TelegramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.942z" />
    </svg>
  );
}

export function CommunityLinksCard({
  whatsappUrl,
  telegramUrl,
  isRegistered,
  itemTitle,
  type = "ورشة",
}: {
  whatsappUrl?: string | null;
  telegramUrl?: string | null;
  isRegistered: boolean;
  itemTitle: string;
  type?: string;
}) {
  const hasLinks = !!(whatsappUrl?.trim() || telegramUrl?.trim());
  if (!hasLinks) return null;

  if (isRegistered) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-950/20 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <WhatsAppIcon className="h-4 w-4" />
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-foreground">
                مجموعات التواصل الرسمية للـ {type} 💬
              </h3>
            </div>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              بصفتك مسجلاً ومقبولاً في «{itemTitle}»، انضم الآن للتواصل مع المدرب وزملائك واستلام التعليمات والملفات أولاً بأول.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {whatsappUrl?.trim() && (
              <a
                href={whatsappUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:scale-[1.02]"
              >
                <WhatsAppIcon className="h-4 w-4" />
                جروب الواتساب
              </a>
            )}

            {telegramUrl?.trim() && (
              <a
                href={telegramUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] hover:bg-[#1e8ec3] px-4 py-2.5 text-xs font-black text-white shadow-sm transition-all hover:scale-[1.02]"
              >
                <TelegramIcon className="h-4 w-4" />
                قناة التليجرام
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // إذا لم يكن مسجلاً أو في قائمة الانتظار
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/60 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-foreground">
            مجموعة الواتساب والتليجرام مخصصة للمقبولين فقط 🔒
          </p>
          <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
            روابط الانضمام لمجتمع الـ {type} تظهر تلقائياً للطلاب المقبولين بعد تأكيد تسجيلهم في الجلسة.
          </p>
        </div>
      </div>
    </div>
  );
}
