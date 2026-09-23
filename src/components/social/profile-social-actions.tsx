"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  UserPlus,
  UserCheck,
  Clock,
  MessageSquare,
  UserMinus,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { sendFriendRequest, respondToFriendRequest, removeFriend } from "@/actions/social";

interface ProfileSocialActionsProps {
  targetUserId: string;
  isSelf: boolean;
  isLoggedIn: boolean;
  friendship: {
    id: string;
    status: string;
    isSender: boolean;
  } | null;
}

export function ProfileSocialActions({
  targetUserId,
  isSelf,
  isLoggedIn,
  friendship: initialFriendship,
}: ProfileSocialActionsProps) {
  const [friendship, setFriendship] = useState(initialFriendship);
  const [isPending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-extrabold text-gold hover:bg-gold/20 transition-all shadow-sm"
      >
        تعديل ملفي الشخصي
      </Link>
    );
  }

  if (!isLoggedIn) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all shadow-md"
      >
        <UserPlus className="h-4 w-4" />
        سجّل دخولك لإضافة الطالب
      </Link>
    );
  }

  const handleSendRequest = () => {
    startTransition(async () => {
      const res = await sendFriendRequest(targetUserId);
      if (res.ok) {
        setFriendship({ id: "temp", status: "PENDING", isSender: true });
        toast.success("تم إرسال طلب الصداقة بنجاح! 👥");
      } else {
        toast.error(res.error || "تعذر إرسال الطلب");
      }
    });
  };

  const handleAcceptRequest = () => {
    if (!friendship?.id) return;
    startTransition(async () => {
      const res = await respondToFriendRequest(friendship.id, true);
      if (res.ok) {
        setFriendship((prev) => (prev ? { ...prev, status: "ACCEPTED" } : null));
        toast.success("أصبحتما أصدقاء الآن! يمكنكما الدردشة بحرية 🎉");
      } else {
        toast.error(res.error || "فشل قبول الطلب");
      }
    });
  };

  const handleRemoveFriend = () => {
    if (!confirm("هل أنت متأكد من رغبتك في إزالة هذا الصديق؟")) return;
    startTransition(async () => {
      const res = await removeFriend(targetUserId);
      if (res.ok) {
        setFriendship(null);
        toast.success("تمت إزالة الصداقة");
      } else {
        toast.error(res.error || "فشل إزالة الصداقة");
      }
    });
  };

  // أصدقاء بالفعل
  if (friendship?.status === "ACCEPTED") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={handleRemoveFriend}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-border bg-card/60 px-3.5 py-2 text-xs font-bold text-muted-foreground hover:text-red-500 hover:border-red-500/30 transition-colors"
          title="إزالة من الأصدقاء"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
          أصدقاء ✓
        </button>
      </div>
    );
  }

  // طلب معلق
  if (friendship?.status === "PENDING") {
    if (friendship.isSender) {
      return (
        <span className="inline-flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-extrabold text-amber-500">
          <Clock className="h-4 w-4" />
          طلب الصداقة معلق
        </span>
      );
    } else {
      return (
        <button
          type="button"
          disabled={isPending}
          onClick={handleAcceptRequest}
          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-500 transition-all shadow-md"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
          قبول طلب الصداقة
        </button>
      );
    }
  }

  // ليسوا أصدقاء بعد
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleSendRequest}
      className="inline-flex items-center gap-2 rounded-2xl bg-gold px-4 py-2 text-xs font-extrabold text-night hover:bg-gold-light transition-all shadow-md disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      إضافة صديق
    </button>
  );
}

