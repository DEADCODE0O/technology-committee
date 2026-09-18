import { redirect } from "next/navigation";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import {
  getRecentChatMessagesForAdmin,
  getReportsList,
} from "@/actions/surveillance";
import { SurveillanceManager } from "@/components/admin/surveillance-manager";
import { Eye, Shield, Lock } from "lucide-react";

export const metadata = {
  title: "المراقبة والإشراف الأمني | لوحة الإدارة",
  description: "مركز المراقبة والإشراف الأمني ومتابعة محادثات الطلاب والرسائل في وضع المراقب الخفي",
};

export default async function AdminSurveillancePage() {
  await requireAdmin();
  const user = await getCurrentUser();

  if (!user || !canUser(user, MODULES.SURVEILLANCE, "view")) {
    redirect("/admin");
  }

  const [initialChatMessages, initialReports] = await Promise.all([
    getRecentChatMessagesForAdmin(60),
    getReportsList(),
  ]);

  return (
    <div className="space-y-6">
      {/* ترويسة الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 shadow-inner">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-foreground">
                المراقبة والإشراف الأمني
              </h1>
              <span className="text-[10px] font-black rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5">
                وضع المراقب الخفي مفعّل
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              فحص المحادثات الفردية والجماعية للطلاب، والتحقق من البلاغات دون تعديل حالات القراءة أو ترك أثر.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-extrabold text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-gold" />
            صلاحية إدارة عليا
          </span>
        </div>
      </div>

      {/* المكون التفاعلي للمراقبة */}
      <SurveillanceManager
        initialChatMessages={initialChatMessages}
        initialReports={initialReports}
      />
    </div>
  );
}