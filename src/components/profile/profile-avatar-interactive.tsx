"use client";

import { useState } from "react";
import { Camera, Sparkles } from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
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
  const [wardrobeOpen, setWardrobeOpen] = useState(false);

  return (
    <>
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setWardrobeOpen(true)}
          className="relative group focus:outline-none rounded-full cursor-pointer transition-all hover:ring-4 hover:ring-gold/30 hover:scale-[1.03]"
          title="انقر لتغيير الصورة الشخصية أو إطار التميز"
          aria-label="تغيير الصورة الشخصية أو إطار التميز"
        >
          <AvatarWithFrame
            avatarUrl={user.avatarUrl}
            name={user.fullName}
            frameId={user.avatarFrameId}
            framesVisible={framesVisible}
            size="2xl"
            level={user.level}
            showLevel
          />

          {/* أيقونة الكاميرا الاحترافية بأسلوب فيسبوك الحديث */}
          <span
            className="absolute bottom-1 end-1 flex h-8 w-8 items-center justify-center rounded-full bg-night/90 dark:bg-zinc-900/90 text-gold border-2 border-gold/60 shadow-xl transition-transform group-hover:scale-110 group-hover:bg-gold group-hover:text-night"
            title="تغيير الصورة أو الإطار"
          >
            <Camera className="h-4 w-4" />
          </span>
        </button>
      </div>

      {/* خزانة المظهر والإطارات وتغيير الصورة مباشرة بنقرة واحدة وبدون زر عشوائي */}
      <FrameWardrobeModal
        user={user}
        framesVisible={framesVisible}
        externalOpen={wardrobeOpen}
        onExternalOpenChange={setWardrobeOpen}
        hideTrigger={true}
      />
    </>
  );
}
