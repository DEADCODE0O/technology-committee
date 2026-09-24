"use client";

// ═══════════════════════════════════════════════════════════════
//  زر «الدخول / التسجيل بـ Google» — عبر Supabase Auth الرسمي
//  (Google OAuth يُدار بالكامل من Supabase — راجع DEPLOY.md:
//   Supabase Dashboard → Authentication → Providers → Google)
//  بدون مفاتيح Supabase (وضع التطوير المحلي): رسالة إرشادية فقط.
// ═══════════════════════════════════════════════════════════════

import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function GoogleButton({
  label,
  returnTo,
}: {
  /** مسار داخلي اختياري يعود إليه الطالب بعد Google OAuth. */
  returnTo?: string;
  /** يُتجاهل — الكشف يتم وقت الضغط من وجود مفاتيح Supabase */
  enabled?: boolean;
  label: string;
}) {
  const onClick = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.info("الدخول بـ Google يتفعّل بعد إعداد Supabase — الخطوات كاملة في دليل DEPLOY.md");
      return;
    }
    const safeReturnTo =
      returnTo &&
      returnTo.startsWith("/") &&
      !returnTo.startsWith("//") &&
      !returnTo.startsWith("/admin")
        ? returnTo
        : "/panel";
    const callback = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(safeReturnTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback,
        queryParams: { prompt: "select_account", access_type: "offline" },
      },
    });
    if (error) {
      toast.error("تعذر بدء الدخول بـ Google — حاول مرة أخرى");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-sm font-extrabold text-foreground shadow-xs transition-all hover:border-gold/50 hover:bg-muted/80 active:scale-[0.99] dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-100 dark:hover:border-white/25 dark:hover:bg-white/[0.08]"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      {label}
    </button>
  );
}
