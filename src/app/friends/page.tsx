import { redirect } from "next/navigation";

// ────────────────────────────────────────────────────────────
// /friends → /messages?tab=requests — تحويل دائم
// الأصدقاء أصبحوا مدمجين في صفحة الرسائل كتبويب
// ────────────────────────────────────────────────────────────

export default function FriendsRedirect() {
  redirect("/messages?tab=requests");
}
