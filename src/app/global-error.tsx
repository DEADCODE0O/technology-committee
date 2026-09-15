"use client";

// ═══════════════════════════════════════════════════════════════
//  Global Error Boundary — آخر خط دفاع (أخطاء layout الجذر)
// ═══════════════════════════════════════════════════════════════

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ backgroundColor: "#09090b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ maxWidth: "420px", textAlign: "center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                border: "1px solid rgba(201,164,92,0.25)",
                background: "rgba(201,164,92,0.08)",
                color: "#c9a45c",
                marginBottom: "16px",
              }}
            >
              <AlertTriangle size={28} />
            </span>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 8px" }}>حدث خطأ غير متوقع</h1>
            <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#a1a1aa", margin: 0 }}>
              ظهر خلل مؤقت — جرّب إعادة المحاولة، ولو استمر تواصل مع إدارة اللجنة.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "24px",
                width: "100%",
                height: "48px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(to bottom, #e6cb8b, #c9a45c)",
                color: "#09090b",
                fontSize: "15px",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <RotateCcw size={20} />
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
