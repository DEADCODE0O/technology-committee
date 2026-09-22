"use client";

// ═══════════════════════════════════════════════════════════════
//  زر «الدخول / التسجيل بـ Facebook» — عبر Supabase Auth الرسمي
// ═══════════════════════════════════════════════════════════════

import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function FacebookButton({
  label,
  returnTo,
}: {
  /** مسار داخلي اختياري يعود إليه الطالب بعد Facebook OAuth */
  returnTo?: string;
  label: string;
}) {
  const onClick = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      toast.info("الدخول بـ Facebook يتفعّل بعد إعداد Supabase");
      return;
    }
    const safeReturnTo = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/panel";
    const callback = `${window.location.origin}/auth/callback?returnTo=${encodeURIComponent(safeReturnTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: callback,
        scopes: "email,public_profile",
      },
    });
    if (error) {
      console.error("Facebook signInWithOAuth error:", error);
      toast.error("تعذر بدء الدخول بـ Facebook — حاول مرة أخرى");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/10 text-sm font-bold text-zinc-100 transition-colors hover:border-[#1877F2]/50 hover:bg-[#1877F2]/20"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
