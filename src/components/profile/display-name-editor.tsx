"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserCheck, Shield, Loader2, Save, Sparkles } from "lucide-react";
import { updateDisplayNameAndBio } from "@/actions/profile";

interface DisplayNameEditorProps {
  initialDisplayName: string | null;
  initialBio: string | null;
  realFullName: string;
}

export function DisplayNameEditor({
  initialDisplayName,
  initialBio,
  realFullName,
}: DisplayNameEditorProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName || "");
  const [bio, setBio] = useState(initialBio || "");
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateDisplayNameAndBio({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      });

      if (res.ok) {
        toast.success("تم تحديث اسمك المعروض ونبذتك بنجاح! ✓");
      } else {
        toast.error(res.error || "تعذر حفظ التعديلات");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5 border-b border-border pb-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/30">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-foreground">
            إعدادات الهوية والاسم المعروض
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            خصص اسمك المستعار الذي يراه زملاؤك في المنصة والشات والمجتمع.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* الاسم الحقيقي (للقراءة فقط مع إيضاح المشرفين) */}
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            الاسم الحقيقي (الرسمي):
          </label>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
            <span>{realFullName}</span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
              <Shield className="h-3 w-3" />
              مرئي للإدارة فقط
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            الاسم المسجل في كشوف الكلية لا يمكن تغييره إلا عبر مسؤولي اللجنة.
          </p>
        </div>

        {/* الاسم المعروض للطلاب (الاسم المستعار) */}
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            الاسم المعروض للزملاء (الاسم المستعار):
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="مثال: أحمد التقني، سارة كودر، ..."
            maxLength={40}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            هذا هو الاسم الذي سيظهر لأصدقائك في المحادثات الخاصة، شاتات الفرق، ومنشورات المجتمع.
          </p>
        </div>

        {/* النبذة التعريفية */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-foreground block">
              النبذة التعريفية (Bio):
            </label>
            <span className="text-[10px] text-muted-foreground font-mono">
              {bio.length}/160
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب سطرين عن اهتماماتك البرمجية، تقنياتك المفضلة، أو أهدافك في اللجنة..."
            rows={3}
            maxLength={160}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-gold resize-none leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2.5 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            حفظ التعديلات
          </button>
        </div>
      </form>
    </div>
  );
}
