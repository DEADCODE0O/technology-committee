import { redirect } from "next/navigation";

// ────────────────────────────────────────────────────────────
// /chat → /messages — تحويل دائم
// الشات العام أصبح مرتبطاً بالأنشطة والفرق بدلاً من صفحة مستقلة
// ────────────────────────────────────────────────────────────

export default function ChatRedirect() {
  redirect("/messages");
}