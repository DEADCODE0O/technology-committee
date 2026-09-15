import { ThemeToggle } from "@/components/ui/theme-toggle";

// ═══════════════════════════════════════════════════════════════
//  زاوية المظهر لصفحات الدخول والتسجيل — محول الوضع في رأس الصفحة
//  (بدونه لا يستطيع الزائر تبديل وضع النهار/الليل من صفحات المصادقة)
// ═══════════════════════════════════════════════════════════════

export function AuthThemeCorner() {
  return (
    <div className="fixed start-4 top-4 z-50 sm:start-6 sm:top-6">
      <ThemeToggle className="shadow-[0_2px_12px_rgba(32,29,25,0.08)] dark:shadow-none" />
    </div>
  );
}
