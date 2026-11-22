import { Link2Off } from "lucide-react";

export default function ExternalRegistrationNotFound() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="noise-overlay" aria-hidden="true" />
      <div
        className="gold-glow-bg pointer-events-none fixed inset-x-0 top-0 h-72 opacity-60"
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/40 text-muted-foreground">
          <Link2Off className="h-7 w-7" />
        </span>
        <h1 className="text-xl font-extrabold text-foreground">
          الرابط غير متاح
        </h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          عذرًا، رابط التسجيل هذا غير صالح أو تم إيقافه أو انتهى صلاحيته.
        </p>
      </div>
    </div>
  );
}
