"use client";

// ═══════════════════════════════════════════════════════════════
//  إدارة المشرفين — ترقية طلاب + صلاحيات دقيقة لكل وحدة
//  تصميم متجاوب بالكامل وفائق السلاسة على الهواتف المحمولة
//  • بطاقات هواتف مريحة للإبهام مع وضوح تام للأزرار والإجراءات
//  • أزرار صلاحيات متجاوبة (2x2 Grid للموبايل و Row للديسكتوب)
//  • شريط بحث فوري وفلاتر سريعة لحسابات المشرفين
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  UserMinus,
  ShieldAlert,
  KeyRound,
  Search,
  ChevronDown,
  SlidersHorizontal,
  X,
  UserCheck,
  Check,
} from "lucide-react";
import { setStaffRole, demoteToStudent, toggleStaffStatus, resetStaffPassword } from "@/actions/staff";
import { EDITABLE_MODULES, parseCustomPerms, type CustomPerms } from "@/lib/permissions";
import { ADMIN_ROLES, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── حالة الصلاحية: افتراضي الدور / عرض / إدارة / ممنوع ───
type PermChoice = "default" | "view" | "manage" | "deny";

const PERM_CHOICES: { key: PermChoice; label: string; hint: string }[] = [
  { key: "default", label: "افتراضي الدور", hint: "حسب الدور العام للمشرف" },
  { key: "view", label: "عرض فقط", hint: "رؤية واستعراض فقط" },
  { key: "manage", label: "إدارة كاملة", hint: "إضافة وتعديل وحذف" },
  { key: "deny", label: "ممنوع نهائياً", hint: "حجب الوصول تماماً" },
];

const PRESETS: {
  label: string;
  role: string;
  perms: Record<string, PermChoice>;
}[] = [
  {
    label: "مشرف ورش وتدريب",
    role: "WORKSHOP_MANAGER",
    perms: {
      workshops: "manage",
      tasks: "manage",
      attendanceScan: "manage",
      attendance: "manage",
      points: "manage",
      community: "view",
      surveys: "view",
    },
  },
  {
    label: "مشرف مهام وتقييم",
    role: "WORKSHOP_MANAGER",
    perms: {
      tasks: "manage",
      workshops: "view",
      points: "manage",
      students: "view",
    },
  },
  {
    label: "مشرف محتوى ومجتمع",
    role: "CONTENT_MANAGER",
    perms: {
      community: "manage",
      surveys: "manage",
      news: "manage",
      drive: "manage",
      workshops: "view",
    },
  },
  {
    label: "مشرف تحضير QR",
    role: "WORKSHOP_MANAGER",
    perms: {
      attendanceScan: "manage",
      attendance: "view",
      workshops: "view",
    },
  },
  {
    label: "مشرف عام",
    role: "ADMIN",
    perms: {
      dashboard: "manage",
      workshops: "manage",
      tasks: "manage",
      surveys: "manage",
      community: "manage",
      attendanceScan: "manage",
      attendance: "manage",
      students: "manage",
      points: "manage",
      badges: "manage",
      notifications: "manage",
    },
  },
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

// ─── الجدول الرئيسي وإدارة المشرفين ───────────────────────────

export function StaffTable({ staff, canManage }: { staff: StaffRow[]; canManage: boolean }) {
  const router = useRouter();
  const [editUser, setEditUser] = useState<StaffRow | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "SUSPENDED" | "SUPER_ADMIN" | "MANAGERS">("ALL");
  const [, startTransition] = useTransition();

  // تصفية وبحث حسابات المشرفين للهاتف والحاسوب
  const filteredStaff = useMemo(() => {
    return staff.filter((s) => {
      // فلتر الحالة أو الدور
      if (activeFilter === "ACTIVE" && s.status !== "ACTIVE") return false;
      if (activeFilter === "SUSPENDED" && s.status !== "SUSPENDED") return false;
      if (activeFilter === "SUPER_ADMIN" && s.role !== "SUPER_ADMIN") return false;
      if (activeFilter === "MANAGERS" && s.role === "SUPER_ADMIN") return false;

      // فلتر البحث بالاسم والبريد
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.name || "").toLowerCase().includes(q);
        const matchesEmail = s.email.toLowerCase().includes(q);
        const matchesRole = (ROLE_LABELS[s.role] || s.role).toLowerCase().includes(q);
        return matchesName || matchesEmail || matchesRole;
      }

      return true;
    });
  }, [staff, searchQuery, activeFilter]);

  const runDemote = (s: StaffRow) => {
    if (!confirm(`تنزيل ${s.name ?? s.email} إلى طالب عادي؟ سيفقد صلاحياته الإدارية.`)) return;
    startTransition(async () => {
      const res = await demoteToStudent(s.id);
      if (res.ok) {
        toast.success("تم التنزيل إلى طالب");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر التنفيذ");
      }
    });
  };

  const runToggleStatus = (s: StaffRow) => {
    const action = s.status === "ACTIVE" ? "تعليق" : "تنشيط";
    if (!confirm(`${action} حساب ${s.name ?? s.email}؟`)) return;
    startTransition(async () => {
      const res = await toggleStaffStatus(s.id);
      if (res.ok) {
        toast.success(`تم ${action} الحساب`);
        router.refresh();
      } else {
        toast.error(res.error || "تعذر التنفيذ");
      }
    });
  };

  const runResetPassword = (s: StaffRow) => {
    if (!confirm(`إعادة تعيين كلمة سر ${s.name ?? s.email}؟ ستظهر كلمة مؤقتة لمرة واحدة.`)) return;
    startTransition(async () => {
      const res = await resetStaffPassword(s.id);
      if (res.ok && res.tempPassword) {
        toast.success(`كلمة السر المؤقتة: ${res.tempPassword}`, { duration: 15000 });
        router.refresh();
      } else {
        toast.error(res.error || "تعذر التنفيذ");
      }
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── شريط الأدوات العلوي: زر الترقية + البحث + الفلاتر ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {canManage && (
          <Button
            onClick={() => setPromoteOpen(true)}
            className="h-11 w-full sm:w-auto rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-deep hover:brightness-110 px-5 text-xs sm:text-sm font-black text-night shadow-md active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="h-4.5 w-4.5" />
            <span>ترقية طالب إلى مشرف ⚡</span>
          </Button>
        )}

        {/* حقل البحث السريع بالاسم أو البريد */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بالاسم أو البريد..."
            className="w-full rounded-2xl border border-border bg-card ps-9 pe-9 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="مسح البحث"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── شريط الفلاتر السريعة بنقرة واحدة للهاتف والحاسوب ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter("ALL")}
          className={`rounded-xl px-3 py-1.5 font-extrabold transition-all shrink-0 cursor-pointer ${
            activeFilter === "ALL"
              ? "bg-gold text-night shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          الكل ({staff.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("ACTIVE")}
          className={`rounded-xl px-3 py-1.5 font-extrabold transition-all shrink-0 cursor-pointer ${
            activeFilter === "ACTIVE"
              ? "bg-emerald-500 text-white shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          النشطون ({staff.filter((s) => s.status === "ACTIVE").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("SUSPENDED")}
          className={`rounded-xl px-3 py-1.5 font-extrabold transition-all shrink-0 cursor-pointer ${
            activeFilter === "SUSPENDED"
              ? "bg-red-500 text-white shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          المعلقون ({staff.filter((s) => s.status === "SUSPENDED").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("SUPER_ADMIN")}
          className={`rounded-xl px-3 py-1.5 font-extrabold transition-all shrink-0 cursor-pointer ${
            activeFilter === "SUPER_ADMIN"
              ? "bg-gold-deep text-white shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          المدير الأعلى ({staff.filter((s) => s.role === "SUPER_ADMIN").length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter("MANAGERS")}
          className={`rounded-xl px-3 py-1.5 font-extrabold transition-all shrink-0 cursor-pointer ${
            activeFilter === "MANAGERS"
              ? "bg-gold text-night shadow-xs"
              : "bg-muted/60 text-muted-foreground hover:text-foreground"
          }`}
        >
          المشرفون ({staff.filter((s) => s.role !== "SUPER_ADMIN").length})
        </button>
      </div>

      {/* ── قائمة بطاقات المشرفين ── */}
      {filteredStaff.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground space-y-2">
          <Search className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="text-xs font-bold">لا يوجد مشرفون يطابقون خيارات البحث أو التصفية</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filteredStaff.map((s) => (
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
      )}

      {/* حوار تعديل الصلاحيات الدقيقة */}
      {editUser && (
        <PermissionsDialog
          user={editUser}
          onClose={() => setEditUser(null)}
        />
      )}

      {/* حوار ترقية طالب إلى مشرف */}
      {promoteOpen && (
        <PromoteDialog onClose={() => setPromoteOpen(false)} />
      )}
    </div>
  );
}

// ─── بطاقة مشرف مهيأة بالكامل للهاتف والحاسوب ─────────────────

function StaffCard({
  staff,
  canManage,
  onEditPerms,
  onDemote,
  onToggleStatus,
  onResetPassword,
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
      if (res.ok) {
        toast.success("تم تغيير الدور بنجاح");
        setRole(newRole);
      } else {
        toast.error(res.error || "تعذر التنفيذ");
      }
    });
  };

  const initials = (staff.name ?? staff.email)
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <li className="rounded-3xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-gold/30">
      <div className="flex flex-col gap-4">
        {/* 1. رأس البطاقة: الصورة والاسم والبريد والشارات */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border border-gold/30 bg-gold/15 text-sm sm:text-base font-black text-gold">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm sm:text-base font-black text-foreground">
                {staff.name ?? "بدون اسم"}
              </p>
              <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">
                {staff.email}
              </p>
            </div>
          </div>

          {/* شارة المشرف الحالي أو الحماية */}
          {staff.isSelf && (
            <span className="rounded-full border border-gold/30 bg-gold/15 px-2.5 py-0.5 text-[10px] font-black text-gold shrink-0">
              أنت
            </span>
          )}
        </div>

        {/* 2. شارات الدور والصلاحيات والحالة */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-black border ${
              staff.role === "SUPER_ADMIN"
                ? "border-gold/50 bg-gold/15 text-gold-deep dark:text-gold"
                : "border-border bg-muted/50 text-foreground"
            }`}
          >
            {ROLE_LABELS[staff.role] ?? staff.role}
          </span>

          {custom && (
            <span className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-black text-sky-500 dark:text-sky-400">
              صلاحيات مخصصة ({Object.keys(custom).length})
            </span>
          )}

          {staff.status === "SUSPENDED" ? (
            <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-500">
              معلق 🚫
            </span>
          ) : (
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-black text-emerald-500">
              نشط ✓
            </span>
          )}
        </div>

        {/* 3. شريط التحكم والإجراءات المريح للهاتف والحاسوب */}
        {canManage && !staff.isSelf && (
          <div className="border-t border-border/70 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* اختيار الدور */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-muted-foreground shrink-0 hidden sm:inline">الدور:</span>
              <Select dir="rtl" value={role} onValueChange={changeRole} disabled={pending || staff.isProtected}>
                <SelectTrigger className="h-10 w-full sm:w-[170px] rounded-xl text-xs font-black border-border bg-muted/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((r) => (
                    <SelectItem key={r} value={r} disabled={r === "SUPER_ADMIN"}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* أزرار الإجراءات */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              {/* زر تعديل الصلاحيات الدقيقة */}
              <button
                type="button"
                onClick={onEditPerms}
                className="col-span-2 sm:col-span-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 hover:bg-gold/20 px-3 text-xs font-black text-gold-deep dark:text-gold transition-colors cursor-pointer active:scale-95"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>الصلاحيات الدقيقة</span>
              </button>

              {/* زر إعادة تعيين كلمة السر */}
              <button
                type="button"
                onClick={onResetPassword}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-2.5 text-xs font-bold text-foreground transition-colors cursor-pointer active:scale-95"
                title="إعادة تعيين كلمة السر"
              >
                <KeyRound className="h-4 w-4 text-gold" />
                <span>كلمة السر</span>
              </button>

              {/* زر تعليق / تنشيط الحساب */}
              <button
                type="button"
                onClick={onToggleStatus}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-bold transition-colors cursor-pointer active:scale-95 ${
                  staff.status === "ACTIVE"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                }`}
                title={staff.status === "ACTIVE" ? "تعليق الحساب" : "تنشيط الحساب"}
              >
                <ShieldAlert className="h-4 w-4" />
                <span>{staff.status === "ACTIVE" ? "تعليق" : "تنشيط"}</span>
              </button>

              {/* زر التنزيل إلى طالب */}
              <button
                type="button"
                onClick={onDemote}
                className="col-span-2 sm:col-span-1 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 px-3 text-xs font-bold text-red-500 transition-colors cursor-pointer active:scale-95"
                title="تنزيل إلى طالب عادي"
              >
                <UserMinus className="h-4 w-4" />
                <span>تنزيل لطالب</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// ─── محرر الصلاحيات الدقيق للهواتف والحاسوب ───────────────────

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

  const applyPreset = (presetPerms: Record<string, PermChoice>) => {
    const next: Record<string, PermChoice> = {};
    for (const m of EDITABLE_MODULES) {
      next[m.key] = presetPerms[m.key] ?? "default";
    }
    setChoices(next);
    toast.info("تم تطبيق القالب، اضغط «حفظ الصلاحيات» للاعتماد");
  };

  const resetToDefault = () => {
    const next: Record<string, PermChoice> = {};
    for (const m of EDITABLE_MODULES) {
      next[m.key] = "default";
    }
    setChoices(next);
    toast.info("تمت استعادة الصلاحيات الافتراضية للدور");
  };

  const save = () => {
    const perms: CustomPerms = {};
    let changed = 0;
    for (const m of EDITABLE_MODULES) {
      const c = choices[m.key];
      if (c === "view") {
        perms[m.key] = "view";
        changed++;
      } else if (c === "manage") {
        perms[m.key] = "manage";
        changed++;
      } else if (c === "deny") {
        perms[m.key] = false;
        changed++;
      }
    }
    if (user.role === "SUPER_ADMIN" && perms.admins === false) {
      delete perms.admins;
    }
    startTransition(async () => {
      const res = await setStaffRole(user.id, user.role, changed > 0 ? perms : null);
      if (res.ok) {
        toast.success(changed > 0 ? `تم حفظ ${changed} صلاحية مخصصة بنجاح` : "أُعيدت الصلاحيات لافتراضي الدور");
        setOpen(false);
        onClose();
        router.refresh();
      } else {
        toast.error(res.error || "تعذر الحفظ");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(false);
          onClose();
        }
      }}
    >
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-border bg-card p-4 sm:p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-black text-foreground">
            صلاحيات المشرف: {user.name ?? user.email}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            حدد صلاحية كل وحدة — «افتراضي الدور» يتبع الدور العام للمشرف، بينما الخيارات الأخرى تتجاوز الافتراضي لهذا الحساب تحديداً.
          </DialogDescription>
        </DialogHeader>

        {/* قوالب الصلاحيات السريعة */}
        <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-3 space-y-2">
          <p className="text-[11px] font-black text-gold">⚡ قوالب جاهزة بنقرة واحدة (Presets):</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.perms)}
                className="rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-black text-gold-deep dark:text-gold hover:bg-gold/20 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              onClick={resetToDefault}
              className="rounded-xl border border-border bg-card px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              إعادة للافتراضي
            </button>
          </div>
        </div>

        {/* قائمة الوحدات وصلاحياتها — متجاوبة بنسبة 100% للهواتف والحاسوب */}
        <ul className="space-y-2.5 max-h-[48vh] overflow-y-auto pe-1 custom-scrollbar">
          {EDITABLE_MODULES.map((m) => (
            <li key={m.key} className="rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-black text-foreground">{m.label}</p>
                  {m.description && (
                    <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                      {m.description}
                    </p>
                  )}
                </div>

                {/* أزرار خيارات الصلاحية: شبكة 2x2 على الموبايل وصف أفقي على الديسكتوب بدون أي ضغط أو تجاوز */}
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                  {PERM_CHOICES.map((c) => {
                    const active = choices[m.key] === c.key;
                    const isDenied = c.key === "deny";
                    const isManage = c.key === "manage";
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setChoice(m.key, c.key)}
                        title={c.hint}
                        disabled={user.role === "SUPER_ADMIN" && m.key === "admins"}
                        className={`h-9 sm:h-8 rounded-xl px-2.5 text-[11px] font-black transition-all cursor-pointer ${
                          active
                            ? isDenied
                              ? "border border-red-500/50 bg-red-500/15 text-red-500 shadow-xs"
                              : isManage
                                ? "border border-gold bg-gold text-night shadow-xs"
                                : "border border-sky-500/50 bg-sky-500/15 text-sky-500 shadow-xs"
                            : "border border-border/80 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
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

        <Button
          onClick={save}
          disabled={pending}
          className="h-12 w-full rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-deep hover:brightness-110 text-xs sm:text-sm font-black text-night shadow-lg active:scale-95 cursor-pointer"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          <span>حفظ وتطبيق الصلاحيات</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار ترقية طالب إلى مشرف ────────────────────────────────

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
    if (!picked) return toast.error("اختر طالبًا أولاً");
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
        toast.success(`تمت ترقية ${picked.name} إلى ${ROLE_LABELS[role]} بنجاح! 👑`);
        setOpen(false);
        onClose();
        router.refresh();
      } else {
        toast.error(res.error || "تعذر التنفيذ");
      }
    });
  };

  const closeAll = () => {
    setOpen(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) closeAll(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl border-border bg-card p-4 sm:p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-black text-foreground">
            ترقية طالب إلى مشرف
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed text-muted-foreground">
            ابحث عن الطالب بالاسم أو البريد، اختر دوره الإداري، وحدد صلاحياته بدقة. يبقى حسابه الطلابي ونقاطه محفوظة بالكامل.
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      search();
                    }
                  }}
                  placeholder="اسم الطالب أو بريده الإلكتروني..."
                  className="h-11 rounded-2xl ps-9"
                />
              </div>
              <Button
                onClick={search}
                disabled={searching}
                className="h-11 rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-deep text-xs font-black text-night shadow-sm cursor-pointer"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span>بحث</span>
              </Button>
            </div>

            {results && results.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-xs font-bold text-muted-foreground">
                لا توجد نتائج مطابقة لبحثك
              </p>
            )}

            {results && results.length > 0 && (
              <ul className="max-h-60 space-y-2 overflow-y-auto custom-scrollbar">
                {results.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setPicked(s)}
                      className="w-full rounded-2xl border border-border/80 bg-card hover:bg-muted hover:border-gold/50 p-3 text-start transition-all cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-black text-foreground truncate">{s.name}</p>
                        <p dir="ltr" className="text-start text-[11px] text-muted-foreground truncate">{s.email}</p>
                      </div>
                      <span className="rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-black text-gold shrink-0">
                        اختيار
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* الطالب المختار */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-gold-deep dark:text-gold">{picked.name}</p>
                <p dir="ltr" className="truncate text-start text-xs text-muted-foreground">{picked.email}</p>
              </div>
              <Button
                onClick={() => setPicked(null)}
                variant="outline"
                className="h-8 shrink-0 rounded-xl border-border text-xs font-bold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                تغيير الطالب
              </Button>
            </div>

            {/* اختيار الدور */}
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-foreground">الدور الوظيفي</Label>
              <Select dir="rtl" value={role} onValueChange={setRole}>
                <SelectTrigger className="h-11 w-full rounded-2xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.filter((r) => r !== "SUPER_ADMIN").map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* قوالب الصلاحيات السريعة */}
            <div className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-3 space-y-2">
              <p className="text-[11px] font-black text-gold">⚡ تطبيق قالب صلاحيات سريع:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setRole(p.role);
                      const next: Record<string, PermChoice> = {};
                      for (const m of EDITABLE_MODULES) {
                        next[m.key] = p.perms[m.key] ?? "default";
                      }
                      setChoices(next);
                      toast.info(`تم اختيار دور «${ROLE_LABELS[p.role]}» وضبط صلاحياته`);
                    }}
                    className="rounded-xl border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] font-black text-gold-deep dark:text-gold hover:bg-gold/20 transition-colors cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* الصلاحيات التفصيلية */}
            <div className="space-y-2">
              <p className="text-xs font-black text-foreground">الصلاحيات التفصيلية</p>
              <ul className="max-h-56 space-y-2 overflow-y-auto pe-1 custom-scrollbar">
                {EDITABLE_MODULES.filter((m) => m.key !== "admins").map((m) => (
                  <li key={m.key} className="rounded-2xl border border-border/70 bg-muted/20 p-3 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-black text-foreground">{m.label}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 shrink-0">
                        {PERM_CHOICES.map((c) => {
                          const active = (choices[m.key] ?? "default") === c.key;
                          const isDenied = c.key === "deny";
                          const isManage = c.key === "manage";
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() => setChoice(m.key, c.key)}
                              title={c.hint}
                              className={`h-8 rounded-xl px-2 text-[10px] sm:text-[11px] font-black transition-all cursor-pointer ${
                                active
                                  ? isDenied
                                    ? "border border-red-500/50 bg-red-500/15 text-red-500 shadow-xs"
                                    : isManage
                                      ? "border border-gold bg-gold text-night shadow-xs"
                                      : "border border-sky-500/50 bg-sky-500/15 text-sky-500 shadow-xs"
                                  : "border border-border/80 bg-card/60 text-muted-foreground hover:bg-muted hover:text-foreground"
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

            <Button
              onClick={promote}
              disabled={pending}
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-gold-light via-gold to-gold-deep hover:brightness-110 text-xs sm:text-sm font-black text-night shadow-lg active:scale-95 cursor-pointer"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
              <span>تأكيد الترقية إلى {ROLE_LABELS[role]} 👑</span>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
