import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canUser, MODULES } from "@/lib/permissions";
import { DriveManager } from "@/components/admin/drive-manager";

export const dynamic = "force-dynamic";

export default async function AdminDrivePage() {
  const user = await requireAdmin();
  const canManage = canUser(user, MODULES.DRIVE, "manage");

  const assets = await db.driveAsset.findMany({ orderBy: { createdAt: "desc" } });

  const oauthConfigured = !!(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-zinc-50">مكتبة جوجل درايف</h1>
        <p className="mt-1 text-sm leading-6 text-zinc-500">
          استغل مساحة درايف حسابك: ارفع الملفات وشاركها «أي شخص لديه الرابط» ثم أضفها هنا —
          بعدها استخدمها في الإشعارات (زر CTA) ومواد المحاضرات وصور الأنشطة بضغطة واحدة.
        </p>
      </div>

      {/* حالة ربط درايف (OAuth مستقبلي) */}
      <div className={`rounded-2xl border p-4 ${oauthConfigured ? "border-emerald-400/25 bg-emerald-400/[0.04]" : "border-white/[0.07] bg-white/[0.02]"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-zinc-200">
              {oauthConfigured ? "✅ الرفع المباشر جاهز للتفعيل" : "📁 وضع الروابط — يعمل الآن بالكامل"}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {oauthConfigured
                ? "مفاتيح Google OAuth مضبوطة — الرفع المباشر من المنصة إلى درايفك متاح."
                : "الرفع المباشر من المنصة إلى درايفك (OAuth) جاهز هيكليًا ويتفعّل بضبط GOOGLE_DRIVE_CLIENT_ID/SECRET — دليل الإعداد في DEPLOY.md. حتى ذلك الحين: ارفع من درايف والصق الرابط هنا."}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${oauthConfigured ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border border-gold/25 bg-gold/[0.08] text-gold-light"}`}>
            {oauthConfigured ? "OAuth جاهز" : "روابط + هيكل OAuth"}
          </span>
        </div>
      </div>

      {/* خطوات المشاركة الصحيحة */}
      <div className="rounded-2xl border border-gold/15 bg-gold/[0.03] p-4">
        <p className="text-xs font-extrabold text-gold-light">خطوات مشاركة ملف من درايف حسابك:</p>
        <ol className="mt-2 space-y-1.5 text-[11px] leading-6 text-zinc-400">
          <li>١. ارفع الملف (صورة/فيديو/PDF) على جوجل درايف من حسابك</li>
          <li>٢. كليك يمين ← «مشاركة» ← «أي شخص لديه الرابط» (Viewer)</li>
          <li>٣. انسخ الرابط والصقه هنا — الصور تُعرض مباشرة في المنصة تلقائيًا</li>
        </ol>
      </div>

      <DriveManager
        canManage={canManage}
        assets={assets.map((a) => ({ id: a.id, title: a.title, url: a.url, kind: a.kind, note: a.note, createdAt: a.createdAt.toISOString() }))}
      />
    </div>
  );
}
