"use client";

// ═══════════════════════════════════════════════════════════════
//  نافذة إضافة موهبة جديدة للطالب من الملف الشخصي
// ═══════════════════════════════════════════════════════════════

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Sparkles, Palette } from "lucide-react";
import { TALENT_CATEGORIES, TALENT_OPTIONS } from "@/lib/constants";
import { addStudentTalentAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddTalentModal({ currentCount }: { currentCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [portfolioUrl, setPortfolioUrl] = useState<string>("");

  const options = category ? TALENT_OPTIONS[category] || [] : [];
  const needsCustom = name.includes("OTHER") || name === "OTHER" || category === "OTHER";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      toast.error("يرجى اختيار تصنيف الموهبة");
      return;
    }
    if (!name && category !== "OTHER") {
      toast.error("يرجى اختيار الموهبة من القائمة");
      return;
    }
    if (needsCustom && customName.trim().length < 2) {
      toast.error("يرجى كتابة اسم الموهبة بوضوح");
      return;
    }

    startTransition(async () => {
      const res = await addStudentTalentAction({
        category,
        name: category === "OTHER" ? "OTHER" : name,
        customName: needsCustom ? customName.trim() : undefined,
        description: description.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });

      if (res.ok) {
        toast.success("تمت إضافة الموهبة إلى ملفك بنجاح! 🎨");
        setOpen(false);
        // إعادة تعيين الحقول
        setCategory("");
        setName("");
        setCustomName("");
        setDescription("");
        setPortfolioUrl("");
        router.refresh();
      } else {
        toast.error(res.error || "تعذر إضافة الموهبة");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 rounded-xl bg-gold/15 text-xs font-bold text-gold-light border border-gold/30 hover:bg-gold/25 hover:text-gold transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          إضافة موهبة جديدة
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border border-white/10 bg-surface/95 p-6 backdrop-blur-xl sm:p-7">
        <DialogHeader className="text-start">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/30 bg-gold/10 text-gold">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-lg font-extrabold text-zinc-100">
                إضافة موهبة جديدة
              </DialogTitle>
              <p className="text-xs text-zinc-500">
                أبرز قدراتك ومهاراتك في ملفك الشخصي ({currentCount}/5 مواهب)
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* تصنيف الموهبة */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">تصنيف الموهبة</Label>
            <Select
              dir="rtl"
              value={category}
              onValueChange={(val) => {
                setCategory(val);
                setName("");
              }}
            >
              <SelectTrigger className="h-11 rounded-xl bg-black/40 border-white/10">
                <SelectValue placeholder="اختر مجال موهبتك" />
              </SelectTrigger>
              <SelectContent>
                {TALENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* قائمة المواهب ضمن التصنيف */}
          {category && category !== "OTHER" && options.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-300">الموهبة</Label>
              <Select dir="rtl" value={name} onValueChange={setName}>
                <SelectTrigger className="h-11 rounded-xl bg-black/40 border-white/10">
                  <SelectValue placeholder="اختر موهبتك المحددة" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* اسم الموهبة إذا كانت أخرى */}
          {needsCustom && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gold-light">اسم الموهبة بالتفصيل</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="مثال: الخط العربي، التعليق الصوتي، الذكاء الاصطناعي..."
                className="h-11 rounded-xl bg-black/40 border-gold/30"
              />
            </div>
          )}

          {/* نبذة عن موهبتك */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">
              نبذة مختصرة أو إنجازاتك في الموهبة (اختياري)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب نبذة بسيطة عن خبرتك أو ما تفضله في هذه الموهبة..."
              rows={3}
              className="resize-none rounded-xl bg-black/40 border-white/10 text-xs"
            />
          </div>

          {/* رابط أعمال أو بروفايل */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-300">
              رابط أعمال أو معرض (Portfolio / GitHub / Behance - اختياري)
            </Label>
            <Input
              dir="ltr"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://..."
              className="h-11 rounded-xl bg-black/40 border-white/10 text-start font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-11 rounded-xl border-white/10 bg-white/[0.02] text-xs font-bold text-zinc-400"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-xl bg-gradient-to-b from-gold-light to-gold text-xs font-extrabold text-night shadow-[0_4px_20px_rgba(201,164,92,0.4)]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  إضافة الموهبة
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
