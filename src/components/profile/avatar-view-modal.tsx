"use client";

import { useState } from "react";
import { Eye, Sparkles, X, User } from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";

interface AvatarViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWardrobe: () => void;
  avatarUrl?: string | null;
  name: string;
  frameId?: string | null;
  level?: number;
}

export function AvatarViewModal({
  isOpen,
  onClose,
  onOpenWardrobe,
  avatarUrl,
  name,
  frameId,
  level = 1,
}: AvatarViewModalProps) {
  const [viewingFull, setViewingFull] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-5 text-center relative">
        <button
          type="button"
          onClick={() => {
            setViewingFull(false);
            onClose();
          }}
          className="absolute top-4 end-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {viewingFull ? (
          <div className="space-y-4 py-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-foreground">{name}</h3>
            <div className="flex items-center justify-center py-4">
              <AvatarWithFrame
                avatarUrl={avatarUrl}
                name={name}
                frameId={frameId}
                size="xl"
                level={level}
                showLevel
              />
            </div>
            <p className="text-xs text-muted-foreground">
              صورة الملف الشخصي والإطار التفاعلي (مستوى {level})
            </p>
            <button
              type="button"
              onClick={() => setViewingFull(false)}
              className="mt-2 text-xs font-bold text-gold hover:underline"
            >
              ← العودة للخيارات
            </button>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            <div className="flex items-center justify-center">
              <AvatarWithFrame
                avatarUrl={avatarUrl}
                name={name}
                frameId={frameId}
                size="lg"
                level={level}
                showLevel={false}
              />
            </div>

            <div>
              <h3 className="text-base font-black text-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                خيارات الصورة الشخصية والإطار
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setViewingFull(true)}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl border border-border bg-muted/40 p-3 text-xs font-extrabold text-foreground hover:border-gold/50 hover:bg-gold/10 transition-all shadow-sm"
              >
                <Eye className="h-4 w-4 text-gold" />
                عرض الصورة بالحجم الكامل
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenWardrobe();
                }}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gold p-3 text-xs font-black text-night hover:bg-gold-light transition-all shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                تغيير الصورة أو الإطار
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
