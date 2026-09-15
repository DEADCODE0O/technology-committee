"use client";

// Select مخصص لفلاتر GET — يحدث hidden input بالقيمة

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function setHidden(name: string, value: string) {
  const el = document.getElementById(`${name}-hidden`) as HTMLInputElement | null;
  if (el) el.value = value;
}

export function FilterSelectProxy({
  selectName, value, options,
}: {
  selectName: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      dir="rtl"
      value={value || "ALL"}
      onValueChange={(v) => setHidden(selectName, v === "ALL" ? "" : v)}
    >
      <SelectTrigger className="h-11 w-full rounded-xl text-start text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">الكل</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function SelectStatusParam({ defaultValue }: { defaultValue: string }) {
  return (
    <Select dir="rtl" value={defaultValue || "ALL"} onValueChange={(v) => setHidden("status", v === "ALL" ? "" : v)}>
      <SelectTrigger className="h-11 w-full rounded-xl text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">الكل</SelectItem>
        <SelectItem value="ACTIVE">نشط</SelectItem>
        <SelectItem value="SUSPENDED">معلق</SelectItem>
      </SelectContent>
    </Select>
  );
}
