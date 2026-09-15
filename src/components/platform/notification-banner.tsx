"use client";

// ═══════════════════════════════════════════════════════════════
//  بنر الإشعار المهم المثبت — أعلى لوحة الطالب
//  يبقى ظاهرًا حتى يضغط الطالب «تم» — ثم يختفي البنر
//  ويظل الإشعار للأبد في مركز الإشعارات للرجوع إليه
//  يدعم: صورة + أزرار إجراء متعددة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { studentDismissNotification, studentMarkNotificationRead } from "@/actions/notifications";
import { CtaLink } from "@/components/platform/cta-link";
import { NOTIFICATION_TYPE_ICONS } from "@/lib/constants";
import { parseNotificationButtons, resolveImageSrc } from "@/lib/links";
import { SmartImg } from "@/components/platform/smart-img";

export type BannerNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  buttons: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  ctaNewTab: boolean;
  linkType: string | null;
};

export function NotificationBanner({ notification }: { notification: BannerNotification }) {
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hidden) return null;

  const btns = parseNotificationButtons(notification.buttons, notification);
  const imgSrc = notification.imageUrl ? resolveImageSrc(notification.imageUrl) : null;

  const dismiss = () =>
    startTransition(async () => {
      const res = await studentDismissNotification(notification.id);
      if (res.ok) {
        setHidden(true);
        toast.success("سنُبقيه في مركز الإشعارات لو احتجته");
      } else toast.error(res.error || "تعذر الإخفاء");
    });

  const markRead = () =>
    startTransition(async () => {
      await studentMarkNotificationRead(notification.id);
    });

  return (
    <div
      dir="rtl"
      className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-l from-gold/[0.13] via-gold/[0.07] to-transparent p-4 sm:p-5"
    >
      {/* شريط ذهبي جانبي مميز */}
      <div className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-gold-light to-gold" />

      <div className="flex items-start gap-3 pe-2">
        <span className="mt-0.5 shrink-0 text-2xl leading-none">{NOTIFICATION_TYPE_ICONS[notification.type] ?? "📌"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-gold-light sm:text-base">{notification.title}</p>
          {notification.body && (
            <p className="mt-1 text-[13px] leading-6 text-zinc-300/90">{notification.body}</p>
          )}

          {imgSrc && (
            <div className="mt-3 overflow-hidden rounded-xl border border-gold/20">
              <SmartImg src={imgSrc} alt="" className="max-h-64 w-full object-cover" />
            </div>
          )}

          {btns.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {btns.map((b, i) => (
                <CtaLink
                  key={i}
                  label={b.label}
                  url={b.url}
                  linkType={b.linkType}
                  newTab={b.newTab}
                  size="md"
                  onClick={markRead}
                />
              ))}
              <a
                href="/notifications"
                className="text-xs font-bold text-zinc-400 underline-offset-4 hover:text-gold-light hover:underline"
              >
                كل الإشعارات
              </a>
            </div>
          )}
        </div>

        <button
          onClick={dismiss}
          disabled={pending}
          title="تم — إخفاء البنر (يبقى في مركز الإشعارات)"
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-1.5 text-xs font-extrabold text-gold-light transition-colors hover:bg-gold/20"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          تم
          <X className="h-3 w-3 opacity-50" />
        </button>
      </div>
    </div>
  );
}
