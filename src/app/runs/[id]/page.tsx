import { redirect } from "next/navigation";

// توجيه قديم → الصفحة الجديدة (توافق الروابط المطبوعة سابقًا)
export default function LegacyRunRedirect({ params }: { params: Promise<{ id: string }> }) {
  return (async () => {
    const { id } = await params;
    redirect(`/sessions/${id}`);
  })();
}
