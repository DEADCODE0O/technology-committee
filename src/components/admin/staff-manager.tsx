"use client";

// ═══════════════════════════════════════════════════════════════
//  إدارة المشرفين — ترقية طلاب + صلاحيات دقيقة لكل وحدة
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserMinus, ShieldAlert, KeyRound, Search, ChevronDown } from "lucide-react";
import { setStaffRole, demoteToStudent, toggleStaffStatus, resetStaffPassword } from "@/actions/staff";
import { EDITABLE_MODULES, parseCustomPerms, type CustomPerms, type Module } from "@/lib/permissions";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── حالة الصلاحية: افتراضي الدور / عرض / إدارة / ممنوع ───
type PermChoice = "default" | "view" | "manage" | "deny";

const PERM_CHOICES: { key: PermChoice; label: string; hint: string }[] = [
  { key: "default", label: "افتراضي الدور", hint: "حسب الدور العام" },
  { key: "view", label: "عرض", hint: "رؤية فقط" },
  { key: "manage", label: "إدارة", hint: "تعديل كامل" },
  { key: "deny", label: "ممنوع", hint: "لا يصل نهائيًا" },
];

type StaffRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  customPermissions: string | null;
  name: string | null;
  isSelf: boolean;
  isProtected: boolean; // المدير الأعلى
};

// ─── الجدول الرئيسي ───────────────────────────────────────────

export function StaffTable({ staff, canManage }: { staff: StaffRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editUser, setEditUser] = useState<StaffRow | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [, startTransition] = useTransition();

  const runDemote = (s: StaffRow) => {
    if (!confirm(`تنزيل ${s.name ?? s.email} إلى طالب عادي؟ سيفقد صلاحياته الإدارية.`)) return;
    startTransition(async () => {
      const res = await demoteToStudent(s.id);
      if (res.ok) { toast.success("تم التنزيل إلى طالب"); router.refresh(); }
      else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  const runToggleStatus = (s: StaffRow) => {
    const action = s.status === "ACTIVE" ? "تعليق" : "تنشيط";
    if (!confirm(`${action} حساب ${s.name ?? s.email}؟`)) return;
    startTransition(async () => {
      const res = await toggleStaffStatus(s.id);
      if (res.ok) { toast.success(`تم ${action} الحساب`); router.refresh(); }
      else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  const runResetPassword = (s: StaffRow) => {
    if (!confirm(`إعادة تعيين كلمة سر ${s.name ?? s.email}؟ ستظهر كلمة مؤقتة مرة واحدة.`)) return;
    startTransition(async () => {
      const res = await resetStaffPassword(s.id);
      if (res.ok && res.tempPassword) {
        toast.success(`كلمة السر المؤقتة: ${res.tempPassword}`, { duration: 15000 });
        router.refresh();
      } else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  return (
    <div className="space-y-4">
      {/* زر الترقية */}
      {canManage && (
        <Button
          onClick={() => setPromoteOpen(true)}
          className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold px-5 text-sm font-extrabold text-night"
        >
          <ShieldCheck className="h-4 w-4" />
          ترقية طالب إلى مشرف
        </Button>
      )}

      <ul className="space-y-3">
        {staff.map((s) => (
          <StaffCard
            key={s.id}
            staff={s}
            canManage={canManage}
            onEditPerms={() => setEditUser(s)}
            onDemote={() => runDemote(s)}
            onToggleStatus={() => runToggleStatus(s)}
            onResetPassword={() => runResetPassword(s)}
          />
        ))}
      </ul>

      {/* حوار تعديل الصلاحيات */}
      {editUser && (
        <PermissionsDialog
          user={editUser}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* حوار الترقية */}
      {promoteOpen && (
        <PromoteDialog onClose={() => setPromoteOpen(false)} />
      )}
    </div>
  );
}

// ─── بطاقة مشرف ───────────────────────────────────────────────

function StaffCard({
  staff, canManage, onEditPerms, onDemote, onToggleStatus, onResetPassword,
}: {
  staff: StaffRow;
  canManage: boolean;
  onEditPerms: () => void;
  onDemote: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState(staff.role);
  const custom = parseCustomPerms(staff.customPermissions);

  const changeRole = (newRole: string) => {
    if (newRole === role) return;
    if (!confirm(`تغيير دور ${staff.name ?? staff.email} إلى «${ROLE_LABELS[newRole]}»؟`)) {
      setRole(staff.role);
      return;
    }
    startTransition(async () => {
      const res = await setStaffRole(staff.id, newRole, null);
      if (res.ok) { toast.success("تم تغيير الدور"); setRole(newRole); }
      else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  const initials = (staff.name ?? staff.email).split(" ").slice(0, 2).map((w) => w[0]).join("");

  return (
    <li className="rounded-3xl border border-white/[0.06] bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.08] text-sm font-extrabold text-gold-light">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-zinc-100">{staff.name ?? "بدون اسم"}</p>
            <p dir="ltr" className="truncate text-start text-xs text-zinc-500">{staff.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                staff.role === "SUPER_ADMIN"
                  ? "border border-gold/40 bg-gold/[0.12] text-gold-light"
                  : "border border-white/10 bg-white/[0.04] text-zinc-400"
              }`}>
                {ROLE_LABELS[staff.role] ?? staff.role}
              </span>
              {custom && (
                <span className="rounded-md border border-sky-400/25 bg-sky-400/[0.08] px-2 py-0.5 text-[10px] font-bold text-sky-300">
                  صلاحيات مخصصة ({Object.keys(custom).length})
                </span>
              )}
              {staff.status === "SUSPENDED" && (
                <span className="rounded-md border border-red-500/25 bg-red-500/[0.06] px-2 py-0.5 text-[10px] font-bold text-red-300">
                  معلق
                </span>
              )}
              {staff.isSelf && (
                <span className="rounded-md border border-gold/20 bg-gold/[0.04] px-2 py-0.5 text-[10px] font-bold text-gold/70">
                  أنت
                </span>
              )}
            </div>
          </div>
        </div>

        {canManage && !staff.isSelf && (
          <div className="flex flex-wrap items-center gap-2">
            <Select dir="rtl" value={role} onValueChange={changeRole} disabled={pending || staff.isProtected}>
              <SelectTrigger className="h-9 w-[150px] rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADMIN_ROLES.map((r) => (
                  <SelectItem key={r} value={r} disabled={r === "SUPER_ADMIN"}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={onEditPerms} variant="outline" className="h-9 rounded-lg border-gold/30 bg-gold/[0.06] text-xs font-extrabold text-gold-light">
              <ChevronDown className="h-3.5 w-3.5" />
              الصلاحيات
            </Button>
            <Button onClick={onResetPassword} variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.03] text-xs font-bold text-zinc-300" title="إعادة تعيين كلمة السر">
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={onToggleStatus} variant="outline" className="h-9 rounded-lg border-white/10 bg-white/[0.03] text-xs font-bold text-zinc-300" title={staff.status === "ACTIVE" ? "تعليق الحساب" : "تنشيط الحساب"}>
              <ShieldAlert className="h-3.5 w-3.5" />
            </Button>
            <Button onClick={onDemote} variant="outline" className="h-9 rounded-lg border-red-400/20 bg-red-500/[0.04] text-xs font-bold text-red-300" title="تنزيل إلى طالب">
              <UserMinus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── محرر الصلاحيات الدقيق (حوار) ─────────────────────────────

function PermissionsDialog({ user, onClose }: { user: StaffRow; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);

  const initial: Record<string, PermChoice> = {};
  const custom = parseCustomPerms(user.customPermissions);
  for (const m of EDITABLE_MODULES) {
    const v = custom?.[m.key];
    initial[m.key] = v === "manage" ? "manage" : v === "view" ? "view" : v === false ? "deny" : "default";
  }
  const [choices, setChoices] = useState<Record<string, PermChoice>>(initial);

  const setChoice = (module: string, choice: PermChoice) => {
    setChoices((p) => ({ ...p, [module]: choice }));
  };

  const save = () => {
    // نرسل فقط القيم غير الافتراضية
    const perms: CustomPerms = {};
    let changed = 0;
    for (const m of EDITABLE_MODULES) {
      const c = choices[m.key];
      if (c === "view") { perms[m.key] = "view"; changed++; }
      else if (c === "manage") { perms[m.key] = "manage"; changed++; }
      else if (c === "deny") { perms[m.key] = false; changed++; }
    }
    if (user.role === "SUPER_ADMIN" && perms.admins === false) {
      // حماية إضافية: لا ننزع إدارة المشرفين من المدير الأعلى هنا
      delete perms.admins;
    }
    startTransition(async () => {
      const res = await setStaffRole(user.id, user.role, changed > 0 ? perms : null);
      if (res.ok) {
        toast.success(changed > 0 ? `تم حفظ ${changed} صلاحية مخصصة` : "أُعيدت الصلاحيات لافتراضي الدور");
        setOpen(false);
        onClose();
        router.refresh();
      } else toast.error(res.error || "تعذر الحفظ");
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); onClose(); } }}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold text-zinc-50">
            صلاحيات {user.name ?? user.email}
          </DialogTitle>
          <DialogDescription className="text-xs leading-6 text-zinc-500">
            حدد لكل وحدة صلاحيتها — «افتراضي الدور» يتبع الدور العام، وأي اختيار آخر يتجاوزه لهذا المشرف وحده.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {EDITABLE_MODULES.map((m) => (
            <li key={m.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-zinc-200">{m.label}</p>
                <div className="flex gap-1">
                  {PERM_CHOICES.map((c) => {
                    const active = choices[m.key] === c.key;
                    const isDenied = c.key === "deny";
                    const isManage = c.key === "manage";
                    return (
                      <button
                        key={c.key}
                        onClick={() => setChoice(m.key, c.key)}
                        title={c.hint}
                        disabled={user.role === "SUPER_ADMIN" && m.key === "admins"}
                        className={`h-8 rounded-lg px-2.5 text-[11px] font-extrabold transition-colors ${
                          active
                            ? isDenied
                              ? "border border-red-400/40 bg-red-500/[0.12] text-red-300"
                              : isManage
                                ? "border border-gold/40 bg-gold/[0.15] text-gold-light"
                                : "border border-sky-400/40 bg-sky-400/[0.12] text-sky-300"
                            : "border border-white/[0.08] bg-transparent text-zinc-500 hover:text-zinc-300"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <Button onClick={save} disabled={pending} className="h-11 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          حفظ الصلاحيات
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار ترقية طالب (بحث + اختيار دور + صلاحيات) ─────────────

export type StudentPick = { id: string; name: string; email: string };

function PromoteDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentPick[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<StudentPick | null>(null);
  const [role, setRole] = useState("WORKSHOP_MANAGER");
  const [choices, setChoices] = useState<Record<string, PermChoice>>({});

  const search = () => {
    const q = query.trim();
    if (q.length < 2) return toast.error("اكتب حرفين على الأقل للبحث");
    setSearching(true);
    fetch(`/api/admin/students-search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data: { students: StudentPick[] }) => setResults(data.students))
      .catch(() => toast.error("تعذر البحث"))
      .finally(() => setSearching(false));
  };

  const setChoice = (module: string, choice: PermChoice) => {
    setChoices((p) => ({ ...p, [module]: choice }));
  };

  const promote = () => {
    if (!picked) return toast.error("اختر طالبًا أولًا");
    const perms: CustomPerms = {};
    for (const m of EDITABLE_MODULES) {
      const c = choices[m.key];
      if (c === "view") perms[m.key] = "view";
      else if (c === "manage") perms[m.key] = "manage";
      else if (c === "deny") perms[m.key] = false;
    }
    startTransition(async () => {
      const res = await setStaffRole(picked.id, role, Object.keys(perms).length ? perms : null);
      if (res.ok) {
        toast.success(`تمت ترقية ${picked.name} إلى ${ROLE_LABELS[role]}`);
        setOpen(false);
        onClose();
        router.refresh();
      } else toast.error(res.error || "تعذر التنفيذ");
    });
  };

  const closeAll = () => { setOpen(false); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeAll(); }}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-base font-extrabold text-zinc-50">ترقية طالب إلى مشرف</DialogTitle>
          <DialogDescription className="text-xs leading-6 text-zinc-500">
            ابحث عن الطالب بالاسم أو البريد، اختر دوره، وحدد صلاحياته بدقة — يبقى حسابه بنفس البريد وكلمة السر.
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
                  placeholder="اسم الطالب أو بريده..."
                  className="h-11 rounded-xl pe-9"
                />
              </div>
              <Button onClick={search} disabled={searching} className="h-11 rounded-xl bg-gradient-to-b from-gold-light to-gold text-xs font-extrabold text-night">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                بحث
              </Button>
            </div>

            {results && results.length === 0 && (
              <p className="rounded-2xl border border-dashed border-gold/15 bg-white/[0.01] px-4 py-6 text-center text-sm text-zinc-500">
                لا نتائج مطابقة
              </p>
            )}
            {results && results.length > 0 && (
              <ul className="max-h-56 space-y-2 overflow-y-auto">
                {results.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setPicked(s)}
                      className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-start transition-colors hover:border-gold/40 hover:bg-gold/[0.05]"
                    >
                      <p className="text-sm font-bold text-zinc-100">{s.name}</p>
                      <p dir="ltr" className="text-start text-xs text-zinc-500">{s.email}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* الطالب المختار */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-gold/[0.06] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-gold-light">{picked.name}</p>
                <p dir="ltr" className="truncate text-start text-xs text-zinc-500">{picked.email}</p>
              </div>
              <Button onClick={() => setPicked(null)} variant="outline" className="h-8 shrink-0 rounded-lg border-white/10 text-xs text-zinc-400">
                تغيير
              </Button>
            </div>

            {/* الدور */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-400">الدور الوظيفي</Label>
              <Select dir="rtl" value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.filter((r) => r !== "SUPER_ADMIN").map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] leading-5 text-zinc-600">
                ابدأ بدور مناسب ثم خصص أدناه — «افتراضي الدور» يتبع الدور المختار.
              </p>
            </div>

            {/* الصلاحيات */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400">الصلاحيات التفصيلية</p>
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {EDITABLE_MODULES.filter((m) => m.key !== "admins").map((m) => (
                  <li key={m.key} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-200">{m.label}</p>
                      <div className="flex gap-1">
                        {PERM_CHOICES.map((c) => {
                          const active = (choices[m.key] ?? "default") === c.key;
                          const isDenied = c.key === "deny";
                          const isManage = c.key === "manage";
                          return (
                            <button
                              key={c.key}
                              onClick={() => setChoice(m.key, c.key)}
                              title={c.hint}
                              className={`h-8 rounded-lg px-2.5 text-[11px] font-extrabold transition-colors ${
                                active
                                  ? isDenied
                                    ? "border border-red-400/40 bg-red-500/[0.12] text-red-300"
                                    : isManage
                                      ? "border border-gold/40 bg-gold/[0.15] text-gold-light"
                                      : "border border-sky-400/40 bg-sky-400/[0.12] text-sky-300"
                                  : "border border-white/[0.08] bg-transparent text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {c.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <Button onClick={promote} disabled={pending} className="h-12 w-full rounded-xl bg-gradient-to-b from-gold-light to-gold text-sm font-extrabold text-night">
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              ترقية إلى {ROLE_LABELS[role]}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
