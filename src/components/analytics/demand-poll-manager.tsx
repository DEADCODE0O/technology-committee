"use client";

// ═══════════════════════════════════════════════════════════════
//  إدارة استطلاعات رغبات وتوجهات الطلاب (Demand Poll Manager)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useTransition } from "react";
import { Plus, CheckCircle, BarChart3, ToggleLeft, ToggleRight, Sparkles, MessageCircle } from "lucide-react";
import { createDemandPoll, toggleDemandPollStatus } from "@/actions/demands";

interface DemandPollItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  totalVotes: number;
  options: { id: string; label: string; votesCount: number; percentage: number }[];
  suggestions: string[];
}

interface DemandPollManagerProps {
  polls: DemandPollItem[];
}

export function DemandPollManager({ polls }: DemandPollManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [opt1, setOpt1] = useState("");
  const [opt2, setOpt2] = useState("");
  const [opt3, setOpt3] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !opt1.trim() || !opt2.trim()) return;

    startTransition(async () => {
      const options = [
        { id: "1", label: opt1.trim() },
        { id: "2", label: opt2.trim() },
      ];
      if (opt3.trim()) {
        options.push({ id: "3", label: opt3.trim() });
      }

      await createDemandPoll({
        title,
        options,
      });

      setTitle("");
      setOpt1("");
      setOpt2("");
      setOpt3("");
      setIsCreating(false);
    });
  };

  const handleToggle = (pollId: string) => {
    startTransition(async () => {
      await toggleDemandPollStatus(pollId);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold-deep dark:text-gold">
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <h4 className="font-heading text-sm font-bold text-foreground">
              استطلاعات وقوائم رغبات الطلاب (Wishlist & Polling)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              تصويت مباشر للطلاب على مواضيع الورش القادمة لمعرفة اتجاهات الطلب
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 rounded-xl bg-gold px-3 py-1.5 text-xs font-bold text-black hover:bg-gold-light transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>طرح استطلاع جديد</span>
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="rounded-xl border border-gold/30 bg-gold/[0.03] p-4 space-y-3">
          <h5 className="font-bold text-xs text-foreground">إنشاء استطلاع رغبات للورش القادمة</h5>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground block mb-1">
              عنوان الاستطلاع أو السؤال:
            </label>
            <input
              type="text"
              required
              placeholder="مثلاً: ما هي الورشة التكنولوجية التي ترغب بها الأسبوع القادم؟"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">الخيار الأول *:</label>
              <input
                type="text"
                required
                placeholder="تطبيقات الذكاء الاصطناعي"
                value={opt1}
                onChange={(e) => setOpt1(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">الخيار الثاني *:</label>
              <input
                type="text"
                required
                placeholder="الأمن السيبراني وحماية البيانات"
                value={opt2}
                onChange={(e) => setOpt2(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">الخيار الثالث (اختياري):</label>
              <input
                type="text"
                placeholder="تحليل البيانات باستخدام Python"
                value={opt3}
                onChange={(e) => setOpt3(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-hidden focus:border-gold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="rounded-lg px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-gold px-4 py-1.5 text-xs font-bold text-black hover:bg-gold-light disabled:opacity-50"
            >
              {isPending ? "جارٍ الحفظ..." : "نشر الاستطلاع"}
            </button>
          </div>
        </form>
      )}

      {polls.length === 0 ? (
        <div className="rounded-xl border border-border/70 p-8 text-center text-xs text-muted-foreground">
          لا توجد استطلاعات نشطة حالياً. انقر على «طرح استطلاع جديد» لقياس رغبات الطلاب.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {polls.map((poll) => (
            <div key={poll.id} className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-2.5">
                <div>
                  <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                    poll.status === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {poll.status === "ACTIVE" ? "نشط ويقبل الأصوات" : "مغلق"}
                  </span>
                  <h5 className="font-heading font-bold text-xs text-foreground mt-1">
                    {poll.title}
                  </h5>
                </div>

                <button
                  onClick={() => handleToggle(poll.id)}
                  title="تغيير حالة الاستطلاع"
                  className="text-xs text-muted-foreground hover:text-foreground p-1"
                >
                  {poll.status === "ACTIVE" ? (
                    <span className="text-[10px] font-bold text-rose-500 underline">إغلاق التصويت</span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-500 underline">إعادة تفعيل</span>
                  )}
                </button>
              </div>

              {/* الخيارات والنسب */}
              <div className="space-y-2 text-xs">
                {poll.options.map((opt) => (
                  <div key={opt.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{opt.label}</span>
                      <span className="font-mono font-bold text-foreground">
                        {opt.votesCount} صوت ({opt.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gold transition-all"
                        style={{ width: `${opt.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground font-mono">
                <span>إجمالي الأصوات: {poll.totalVotes}</span>
                {poll.suggestions.length > 0 && (
                  <span className="flex items-center gap-1 text-gold-deep dark:text-gold">
                    <MessageCircle className="h-3 w-3" />
                    {poll.suggestions.length} مقترحات حرة من الطلاب
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
