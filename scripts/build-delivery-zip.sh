#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  بناء حزمة التسليم النهائية — tech-committee-platform.zip
#  حزمة مرتبة كاملة قابلة للرفع على GitHub → Vercel مباشرة
#  تُستثنى: node_modules / .next / .env / قاعدة البيانات المحلية /
#  السجلات / أدوات الاختبار — تُضمّن: .env.example
# ═══════════════════════════════════════════════════════════════
set -e
cd /home/z/my-project

STAGE=/tmp/tech-committee-package
rm -rf "$STAGE"
mkdir -p "$STAGE"

# ─── الملفات الجذرية ───
for f in package.json tsconfig.json next.config.ts postcss.config.mjs \
         tailwind.config.ts components.json eslint.config.mjs \
         README.md DEPLOY.md .env.example .gitignore; do
  [ -f "$f" ] && cp "$f" "$STAGE/"
done

# ─── المجلدات الأساسية ───
cp -r src "$STAGE/src"
cp -r prisma "$STAGE/prisma"
cp -r public "$STAGE/public"
cp -r supabase "$STAGE/supabase"  # سياسات RLS الجاهزة

# ─── مستندات إضافية منظمة ───
mkdir -p "$STAGE/docs"
cp README.md "$STAGE/docs/" 2>/dev/null || true
cp DEPLOY.md "$STAGE/docs/" 2>/dev/null || true

# ─── تنظيف داخل النسخة ───
rm -f "$STAGE/prisma/seed.js" 2>/dev/null || true
find "$STAGE" -name "*.log" -delete 2>/dev/null || true
find "$STAGE" -name ".DS_Store" -delete 2>/dev/null || true

# ─── البناء ───
OUT=/home/z/my-project/download/tech-committee-platform.zip
rm -f "$OUT"
cd "$STAGE"
zip -r -q "$OUT" .
cd /home/z/my-project

COUNT=$(unzip -l "$OUT" | tail -1 | awk '{print $2}')
SIZE=$(du -h "$OUT" | cut -f1)
echo "✅ الحزمة جاهزة: $OUT"
echo "   الملفات: $COUNT | الحجم: $SIZE"

# تحقق سريع من العناصر الحرجة
for need in "package.json" "prisma/schema.prisma" "prisma/migrations/20260909_initial_supabase/migration.sql" \
            "src/app/page.tsx" "src/lib/rate-limit.ts" "src/app/api/admin/upload/route.ts" \
            "src/app/api/route.ts" ".env.example" "DEPLOY.md" "public/images/logo.png" \
            "supabase/rls.sql" "src/lib/supabase/server.ts" "src/middleware.ts" \
            "src/app/auth/callback/route.ts" "src/actions/phone.ts" "src/lib/sms.ts" \
            "src/lib/excel.ts" "src/lib/validation.ts" "src/lib/gate.ts" \
            "src/app/api/admin/students/export/route.ts" "src/app/api/admin/upload-template/route.ts" \
            "src/app/api/runs/upload-answer/route.ts
  src/app/api/admin/runs/[id]/export/route.ts
  src/lib/activities.ts
  src/lib/links.ts
  src/lib/notifications.ts
  src/lib/dates.ts
  src/actions/activities.ts
  src/actions/notifications.ts
  src/actions/drive.ts
  src/app/activities/page.tsx
  src/app/runs/[id]/page.tsx
  src/app/notifications/page.tsx
  src/app/admin/(panel)/programs/page.tsx
  src/app/admin/(panel)/runs/[id]/page.tsx
  src/app/admin/(panel)/notifications/page.tsx
  src/app/admin/(panel)/drive/page.tsx
  src/components/platform/notification-banner.tsx
  src/components/platform/notifications-list.tsx
  src/components/platform/cta-link.tsx
  src/components/platform/countdown.tsx
  prisma/migrate-v2.mjs" "docs/DEPLOY.md"; do
  unzip -l "$OUT" | grep -q " $need\$" && echo "   ✓ $need" || echo "   ✗✗✗ MISSING: $need"
done
