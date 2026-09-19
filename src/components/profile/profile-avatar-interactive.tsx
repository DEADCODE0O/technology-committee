"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { AvatarWithFrame } from "@/components/ui/avatar-with-frame";
import { AvatarViewModal } from "./avatar-view-modal";
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
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setViewModalOpen(true)}
        className="relative group focus:outline-none rounded-full cursor-pointer transition-transform hover:scale-105"
        title="انقر لعرض الصورة أو تغييرها"
        aria-label="خيارات الصورة الشخصية"
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

        {/* أيقونة الكاميرا التفاعلية عند التمرير (مثل فيسبوك) */}
        <span className="absolute bottom-1 end-1 flex h-8 w-8 items-center justify-center rounded-full bg-card/90 border border-gold/40 text-gold shadow-lg transition-transform group-hover:scale-110">
          <Camera className="h-4 w-4" />
        </span>
      </button>

      {/* نافذة خيارات فيسبوك: عرض الصورة أو تغييرها */}
      <AvatarViewModal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        onOpenWardrobe={() => setWardrobeOpen(true)}
        avatarUrl={user.avatarUrl}
        name={user.fullName}
        frameId={user.avatarFrameId}
        level={user.level}
      />

      {/* خزانة الإطارات وتغيير الصورة */}
      <FrameWardrobeModal
        user={user}
        framesVisible={framesVisible}
        externalOpen={wardrobeOpen}
        onExternalOpenChange={setWardrobeOpen}
      />
    </>
  );
}
