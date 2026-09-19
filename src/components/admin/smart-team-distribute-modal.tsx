"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Shuffle,
  Users,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { distributeStudentsToTeams, DistributionResult } from "@/actions/team-distribute";

interface SmartTeamDistributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SmartTeamDistributeModal({
  isOpen,
  onClose,
  onSuccess,
}: SmartTeamDistributeModalProps) {
  const [method, setMethod] = useState<"RANDOM" | "ORDERED" | "BALANCED">("BALANCED");
  const [teamCount, setTeamCount] = useState(3);
  const [teamPrefix, setTeamPrefix] = useState("فريق");
  const [maxPerTeam, setMaxPerTeam] = useState("");
  const [previewData, setPreviewData] = useState<DistributionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handlePreview = () => {
    startTransition(async () => {
      const res = await distributeStudentsToTeams(
        {
          source: "ALL_STUDENTS",
          method,
          targetMode: "NEW_TEAMS",
          newTeamCount: teamCount,
          newTeamPrefix: teamPrefix,
          constraints: {
            maxPerTeam: maxPerTeam ? parseInt(maxPerTeam, 10) : undefined,
            genderBalance: method === "BALANCED",
          },
        },
        true // dry run
      );

      if (res.ok) {
        setPreviewData(res);
        toast.info(res.message || "تم تجهيز المعاينة");
      } else {
        toast.error(res.error || "تعذر إعداد المعاينة");
      }
    });
  };

  const handleExecute = () => {
    if (!confirm(`هل أنت متأكد من تنفيذ التوزيع وإنشاء ${teamCount} فرق جديدة مع شات خاص لكل فريق؟`)) return;

    startTransition(async () => {
      const res = await distributeStudentsToTeams(
        {
          source: "ALL_STUDENTS",
          method,
          targetMode: "NEW_TEAMS",
          newTeamCount: teamCount,
          newTeamPrefix: teamPrefix,
          constraints: {
            maxPerTeam: maxPerTeam ? parseInt(maxPerTeam, 10) : undefined,
            genderBalance: method === "BALANCED",
          },
        },
        false // real execute
      );

      if (res.ok) {
        toast.success(res.message || "تم توزيع الطلاب بنجاح!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "حدث خطأ أثناء التوزيع");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">
                التوزيع الذكي للطلاب على الفرق 👥
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                توزيع عشوائي أو مرتب أو متوازن مع إنشاء شات مخصص تلقائي لكل فريق.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* نموذج الإعدادات */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1.5">
              طريقة التوزيع:
            </label>
            <div className="space-y-2">
              {[
                { key: "BALANCED", label: "متوازن (تكافؤ وتوازن الجنسين 👨‍🎓👩‍🎓)", desc: "يوزع الشباب والبنات بالتساوي على الفرق" },
                { key: "RANDOM", label: "عشوائي تام 🎲", desc: "خلط عشوائي بدون ترتيب" },
                { key: "ORDERED", label: "أبجدي بالترتيب 🔤", desc: "ترتيب أبجدي حسب الاسم" },
              ].map((m) => (
                <label
                  key={m.key}
                  className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                    method === m.key
                      ? "bg-purple-500/10 border-purple-500/40 text-foreground"
                      : "bg-muted/30 border-border text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.key}
                    checked={method === m.key}
                    onChange={() => {
                      setMethod(m.key as any);
                      setPreviewData(null);
                    }}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="text-xs font-extrabold block">{m.label}</span>
                    <span className="text-[11px] opacity-75">{m.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                عدد الفرق المستهدفة:
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={teamCount}
                onChange={(e) => {
                  setTeamCount(parseInt(e.target.value, 10) || 2);
                  setPreviewData(null);
                }}
                className="w-full rounded-2xl border border-border bg-muted/40 p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                بادئة اسم الفريق:
              </label>
              <input
                type="text"
                value={teamPrefix}
                onChange={(e) => {
                  setTeamPrefix(e.target.value);
                  setPreviewData(null);
                }}
                placeholder="مثال: فريق أو مجموعة"
                className="w-full rounded-2xl border border-border bg-muted/40 p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                أقصى عدد طلاب لكل فريق (اختياري):
              </label>
              <input
                type="number"
                min={1}
                value={maxPerTeam}
                onChange={(e) => {
                  setMaxPerTeam(e.target.value);
                  setPreviewData(null);
                }}
                placeholder="اتركه فارغاً للتوزيع المتساوي"
                className="w-full rounded-2xl border border-border bg-muted/40 p-2.5 text-xs text-foreground focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* ── بطاقة المعاينة إن وجدت ── */}
        {previewData && previewData.rosters && (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4 max-h-64 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span>نتائج المعاينة ({previewData.studentsDistributed} طالباً)</span>
              <span className="text-purple-400">{previewData.teamsCount} فرق</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {previewData.rosters.map((roster, idx) => {
                const males = roster.members.filter((m) => m.gender !== "FEMALE").length;
                const females = roster.members.filter((m) => m.gender === "FEMALE").length;

                return (
                  <div key={idx} className="rounded-xl border border-border bg-card p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-black text-foreground">
                      <span>{roster.teamName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {roster.members.length} عضو (👨 {males} · 👩 {females})
                      </span>
                    </div>
                    <ul className="text-[11px] text-muted-foreground list-disc list-inside space-y-0.5">
                      {roster.members.slice(0, 5).map((m) => (
                        <li key={m.id} className="truncate">
                          {m.name}
                        </li>
                      ))}
                      {roster.members.length > 5 && (
                        <li className="text-[10px] italic text-gold">
                          و {roster.members.length - 5} طلاب آخرين...
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* أزرار التحكم */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            إلغاء
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={handlePreview}
              className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2.5 text-xs font-extrabold text-purple-400 hover:bg-purple-500/20 transition-all"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              معاينة التوزيع
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleExecute}
              className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-500 transition-all shadow-md"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              تنفيذ التوزيع وإنشاء الشاتات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
