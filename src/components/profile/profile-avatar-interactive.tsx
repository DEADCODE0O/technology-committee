"use client";

// ═══════════════════════════════════════════════════════════════
//  الصورة الشخصية التفاعلية مع محرر واتساب وفصل خزانة الإطارات
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { WhatsappAvatarModal } from "./whatsapp-avatar-modal";
import { FrameWardrobeModal } from "./frame-wardrobe-modal";

interface ProfileAvatarInteractiveProps {
  user: {
    fullName: string;
    avatarUrl?: string | null;
    accountAvatarUrl?: string | null;
    avatarFrameId?: string | null;
    level: number;
    points: number;
    provider: string;
  };
  framesVisible?: boolean;
}

export function ProfileAvatarInteractive({
  user,
  framesVisible = true,
}: ProfileAvatarInteractiveProps) {
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [framesModalOpen, setFramesModalOpen] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(user.avatarUrl ?? null);

  return (
    <div className="flex flex-col items-center sm:items-start gap-2.5">
      {/* ── 1. الصورة الشخصية مع أيقونة الكاميرا (تفتح محرر واتساب حصراً) ── */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setPhotoModalOpen(true)}
          className="relative group focus:outline-none rounded-full cursor-pointer transition-all hover:ring-4 hover:ring-gold/35 hover:scale-[1.03]"
          title="انقر لتغيير أو استعادة صورتك الشخصية"
          aria-label="تغيير أو استعادة صورتك الشخصية"
        >
          <AvatarWithFrame
            avatarUrl={currentAvatarUrl}
            name={user.fullName}
            frameId={user.avatarFrameId}
            framesVisible={framesVisible}
            size="2xl"
            level={user.level}
            showLevel
          />

          {/* شارة الكاميرا بنمط واتساب وفيسبوك الحديث */}
          <span
            className="absolute bottom-1 end-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#121b22] text-gold border-2 border-gold/70 shadow-2xl transition-all group-hover:scale-110 group-hover:bg-gold group-hover:text-night"
            title="تغيير الصورة الشخصية"
          >
            <Camera className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* ── 2. زر منفصل ومخصص لخزانة الإطارات (مستقل تماماً عن الصور) ── */}
      {framesVisible && (
        <button
          type="button"
          onClick={() => setFramesModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/[0.08] hover:bg-gold/[0.18] px-3.5 py-1 text-[11px] font-black text-gold-deep dark:text-gold-light transition-all shadow-sm hover:border-gold/60 active:scale-95"
          title="افتح خزانة إطارات التميز للمستويات"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span>{user.avatarFrameId ? "تغيير إطار التميز 👑" : "اختر إطار التميز 👑"}</span>
        </button>
      )}

      {/* نافذة تغيير الصورة بأسلوب واتساب (WhatsApp Style) */}
      <WhatsappAvatarModal
        user={{
          fullName: user.fullName,
          avatarUrl: currentAvatarUrl,
          accountAvatarUrl: user.accountAvatarUrl,
          provider: user.provider,
        }}
        isOpen={photoModalOpen}
        onOpenChange={setPhotoModalOpen}
        onAvatarUpdated={(newUrl) => setCurrentAvatarUrl(newUrl)}
      />

      {/* نافذة خزانة الإطارات المستقلة */}
      {framesVisible && (
        <FrameWardrobeModal
          user={{
            fullName: user.fullName,
            avatarUrl: currentAvatarUrl,
            avatarFrameId: user.avatarFrameId,
            level: user.level,
            points: user.points,
          }}
          framesVisible={framesVisible}
          externalOpen={framesModalOpen}
          onExternalOpenChange={setFramesModalOpen}
          hideTrigger={true}
        />
      )}
    </div>
  );
}
