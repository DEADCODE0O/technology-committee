"use client";

// محرر الشارات + قائمة الحائزين

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Users } from "lucide-react";
import { upsertBadge } from "@/actions/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type BadgeRow = { id: string; name: string; description: string; icon: string; holders: number };

const EMOJIS = ["🏆", "🎨", "🎯", "⭐", "🥇", "🔥", "💡", "🌟", "🎖️", "🚀", "🎤", "📚", "⚡", "💎", "🦾"];

export function BadgeEditor({ badges, canManage }: { badges: BadgeRow[]; canManage: boolean }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🏆");
  const [busy, setBusy] = useState<string | null>(null);

  const create = () => {
    if (newName.trim().length < 2) return toast.error("اكتب اسم الشارة");
    if (newDesc.trim().length < 5) return toast.error("اكتب وصفًا موجزًا");
    setBusy("new");
    upsertBadge(undefined, newName.trim(), newDesc.trim(), newIcon)
      .then((res) => {
        if (res.ok) {
          toast.success("تم إنشاء الشارة 🏅");
          setCreating(false); setNewName(""); setNewDesc("");
          router.refresh();
        } else toast.error(res.error || "تعذر الإنشاء");
      })
      .finally(() => setBusy(null));
  };

  const save = (b: BadgeRow, name: string, desc: string, icon: string) => {
    setBusy(b.id);
    upsertBadge(b.id, name, desc, icon)
      .then((res) => {
        if (res.ok) { toast.success("تم الحفظ"); router.refresh(); }
        else toast.error(res.error || "تعذر الحفظ");
      })
      .finally(() => setBusy(null));
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <Button
          onClick={() => setCreating((v) => !v)}
          className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night"
        >
          <Plus className="h-4 w-4" />
          شارة جديدة
        </Button>
      )}

      {/* إنشاء جديد */}
      {creating && (
        <div className="space-y-4 rounded-3xl border border-gold/25 bg-gold/[0.03] p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_2fr]">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الأيقونة</Label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewIcon(e)}
                    className={`h-10 w-10 rounded-xl border text-lg transition-all ${newIcon === e ? "border-gold bg-gold/[0.15]" : "border-white/10 hover:border-gold/30"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">الاسم</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثال: عقل ريادي" className="h-11 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-300">الوصف</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="مثال: قدم مشروعًا تقنيًا متميزًا" className="h-11 rounded-xl" />
              </div>
            </div>
          </div>
          <Button onClick={create} disabled={busy === "new"} className="h-11 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
            {busy === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            إنشاء الشارة
          </Button>
        </div>
      )}

      {/* القائمة */}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {badges.map((b) => (
          <BadgeCard key={b.id} badge={b} canManage={canManage} busy={busy === b.id} onSave={(n, d, i) => save(b, n, d, i)} />
        ))}
      </ul>
    </div>
  );
}

function BadgeCard({ badge, canManage, busy, onSave }: { badge: BadgeRow; canManage: boolean; busy: boolean; onSave: (name: string, desc: string, icon: string) => void }) {
  const [name, setName] = useState(badge.name);
  const [desc, setDesc] = useState(badge.description);
  const [icon, setIcon] = useState(badge.icon);

  return (
    <li className="space-y-3 rounded-3xl border border-white/[0.06] bg-surface p-5">
      <div className="flex items-center gap-4">
        <select
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          disabled={!canManage}
          className="h-14 w-16 rounded-2xl border border-gold/25 bg-gold/[0.06] text-center text-2xl"
          aria-label="أيقونة الشارة"
        >
          {EMOJIS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <div className="min-w-0 flex-1">
          {canManage ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-lg font-bold" />
          ) : (
            <p className="truncate text-sm font-extrabold text-zinc-100">{name}</p>
          )}
          <p className="mt-1.5 flex items-center gap-1 text-[11px] text-zinc-500">
            <Users className="h-3 w-3" />
            {badge.holders} حائزًا
          </p>
        </div>
      </div>

      {canManage ? (
        <>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-10 rounded-lg text-xs" />
          <Button
            onClick={() => onSave(name, desc, icon)}
            disabled={busy}
            variant="outline"
            className="h-9 w-full rounded-lg border-gold/30 bg-gold/[0.06] text-xs font-extrabold text-gold-light"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            حفظ
          </Button>
        </>
      ) : (
        <p className="text-xs leading-6 text-zinc-400">{desc}</p>
      )}
    </li>
  );
}
