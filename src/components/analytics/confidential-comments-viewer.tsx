"use client";

// ═══════════════════════════════════════════════════════════════
//  عارض الملاحظات والتقييمات السرية (Confidential Comments Viewer)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { MessageSquare, Lock, ThumbsUp, ThumbsDown, Star, AlertCircle, Calendar } from "lucide-react";

interface CommentItem {
  id: string;
  instructorRating: number;
  contentRating: number;
  organizationRating: number;
  privateFeedback: string | null;
  strengths: string | null;
  improvements: string | null;
  createdAt: Date;
}

interface ConfidentialCommentsViewerProps {
  comments: CommentItem[];
  sessionTitle: string;
}

export function ConfidentialCommentsViewer({ comments, sessionTitle }: ConfidentialCommentsViewerProps) {
  const [filterRating, setFilterRating] = useState<number | "ALL">("ALL");

  const filtered = comments.filter((c) => {
    if (filterRating === "ALL") return true;
    const avg = Math.round((c.instructorRating + c.contentRating + c.organizationRating) / 3);
    return avg === filterRating;
  });

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
              <Lock className="h-4 w-4" />
            </span>
            <h3 className="font-heading text-lg font-bold text-foreground">
              سجل الملاحظات والشكاوى السرية للطلاب ({comments.length})
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            ملاحظات غير معلنة تظهر حصرياً لقيادة اللجنة لاكتشاف العيوب الحقيقية لـ:{" "}
            <span className="font-bold text-foreground">{sessionTitle}</span>
          </p>
        </div>

        {/* فلاتر النجوم */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterRating("ALL")}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              filterRating === "ALL"
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            الكل ({comments.length})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = comments.filter(
              (c) => Math.round((c.instructorRating + c.contentRating + c.organizationRating) / 3) === stars
            ).length;
            return (
              <button
                key={stars}
                onClick={() => setFilterRating(stars)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  filterRating === stars
                    ? "bg-amber-500 text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{stars}</span>
                <Star className="h-3 w-3 fill-current" />
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          لا توجد ملاحظات سرية مسجلة ضمن هذا التصنيف حتى الآن.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {filtered.map((item) => {
            const avgRating = ((item.instructorRating + item.contentRating + item.organizationRating) / 3).toFixed(1);
            return (
              <div
                key={item.id}
                className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3 transition-all hover:border-border"
              >
                {/* هيدر التقييم */}
                <div className="flex items-center justify-between border-b border-border/40 pb-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-500 flex items-center gap-0.5">
                      {avgRating} <Star className="h-3 w-3 fill-amber-500" />
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      (المحاضر: {item.instructorRating}★ · المحتوى: {item.contentRating}★ · التنظيم: {item.organizationRating}★)
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Calendar className="h-3 w-3" />
                    {new Date(item.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>

                {/* الملاحظة السرية الحرة */}
                {item.privateFeedback && (
                  <div className="rounded-lg bg-background/80 p-3 border border-border/50 text-xs text-foreground leading-relaxed">
                    <span className="font-bold text-rose-500 block mb-1">تعليق وملاحظة خاصة:</span>
                    {item.privateFeedback}
                  </div>
                )}

                {/* نقاط القوة */}
                {item.strengths && (
                  <div className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                    <ThumbsUp className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">ما نال الإعجاب: </span>
                      <span className="text-foreground/80">{item.strengths}</span>
                    </div>
                  </div>
                )}

                {/* نقاط الضعف والمقترحات */}
                {item.improvements && (
                  <div className="flex items-start gap-2 text-xs text-orange-600 dark:text-orange-400">
                    <ThumbsDown className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold">مقترحات التحسين والتدارك: </span>
                      <span className="text-foreground/80">{item.improvements}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
