import { redirect } from "next/navigation";

// توافق الروابط القديمة — كل الورش أصبحت أنشطة
export default function WorkshopsRedirect() {
  redirect("/activities");
}
