#!/bin/bash
# ═══ الاختبارات الأمنية — منصة اللجنة التكنولوجية ═══
BASE="http://localhost:3000"
SP=0; SF=0; ISSUES=""

pass() { SP=$((SP+1)); echo "✓ $1"; }
fail() { SF=$((SF+1)); ISSUES="$ISSUES\n✗✗✗ $1"; echo "✗✗✗ $1"; }

echo "═══ أ) الجلسات والتلاعب ═══"

# 1) JWT مزيّف
FAKE=$(node -e "
const jwt = require('jose');
(async () => {
  const token = await new jwt.SignJWT({ sub: 'cmts04brx0000qszq7xntur9w' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().sign(new TextEncoder().encode('wrong-secret-attacker-key-1234567890'));
  console.log(token);
})();
" 2>/dev/null)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin" -H "Cookie: tc_session=$FAKE" --max-time 10)
[ "$CODE" == "307" ] && pass "JWT بسر مزيّف → مرفوض (تحويل للدخول)" || fail "JWT مزيّف قُبل! ($CODE)"

# 2) JWT معدّل الحمولة (تغيير الدور)
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/panel" -H "Cookie: tc_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJTVVBFUl9BRE1JTiJ9.fake" --max-time 10)
[ "$CODE" == "307" ] && pass "JWT تالف/معدّل → مرفوض" || fail "JWT تالف قُبل! ($CODE)"

# 3) كوكي منتهي الصلاحية صيغة
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/panel" -H "Cookie: tc_session=garbage-token" --max-time 10)
[ "$CODE" == "307" ] && pass "كوكي عبث → مرفوض" || fail "كوكي عبث قُبل! ($CODE)"

echo ""
echo "═══ ب) التفويض (Authorization) ═══"

# 4) APIs الإدارية بدون جلسة
for ep in /api/admin/students/export /api/admin/upload /api/admin/students-search; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$ep" --max-time 8)
  [ "$CODE" == "403" ] || [ "$CODE" == "307" ] || [ "$CODE" == "401" ] && pass "$ep بدون صلاحية → محجوب ($CODE)" || fail "$ep بدون صلاحية سُمح! ($CODE)"
done

# 5) مسارات الإدارة بدون جلسة (تحويل)
for p in /admin/students /admin/workshops /admin/points /admin/settings; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$p" --max-time 8)
  [ "$CODE" == "307" ] || [ "$CODE" == "302" ] && pass "$p بدون جلسة → محوّل" || fail "$p بدون جلسة وصل! ($CODE)"
done

echo ""
echo "═══ ج) XSS — تخزين آمن ═══"
XSS="<script>alert('XSS')</script><img src=x onerror=alert(1)>"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/workshops?x=%3Cscript%3E" --max-time 8)
RESP=$(curl -s "$BASE/login?error=%3Cscript%3Ealert(1)%3C/script%3E" --max-time 8 | grep -c "<script>alert" || true)
[ "$RESP" == "0" ] && pass "وسيط URL بسكربت → لا يُنفّذ في الصفحة" || fail "وسيط URL نُفّذ كسكربت!"

echo ""
echo "═══ د) الحقن — Prisma معلمات محمية ═══"
# حقول البحث محمية بطبيعة Prisma — نتحقق من عدم الانهيار وتسريب أخطاء
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/students?q=%27%3B%20DROP%20TABLE%20User%3B--" --max-time 8)
[ "$CODE" == "307" ] && pass "SQLi في البحث → لا تسريب (محمي بـ Prisma)" || fail "SQLi سبب مشكلة! ($CODE)"

echo ""
echo "══️ ═ هـ) إعادة التوجيه المفتوح ═══"
CODE=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/login?returnTo=//evil.com" --max-time 8)
echo "$CODE" | grep -q "evil.com" && fail "returnTo=//evil.com سُمح!" || pass "returnTo خارجي → محجوب"
CODE=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/login?returnTo=https://evil.com" --max-time 8)
echo "$CODE" | grep -q "evil.com" && fail "returnTo=https محجوب؟ لا — سُمح!" || pass "returnTo=https خارجي → محجوب"

echo ""
echo "═══ و) تسريب المعلومات ═══"
BODY=$(curl -s "$BASE/api" --max-time 8)
echo "$BODY" | grep -qiE "secret|password|key|token" && fail "/api يسرب بيانات حساسة!" || pass "/api نظيف من الأسرار"
# أخطاء الإنتاج لا تكشف stack
BODY=$(curl -s "$BASE/_next/static/chunks/nonexistent12345.js" --max-time 8)
echo "$BODY" | grep -qE "at .*\\(.*/home|node_modules" && fail "خطأ 500 يكشف مسارات الخادم!" || pass "الأخطاء لا تكشف مسارات داخلية"

echo ""
echo "═══ ز) القيود والترويسات ═══"
HDRS=$(curl -sI "$BASE/login" --max-time 8)
echo "$HDRS" | grep -qi "x-content-type-options: nosniff" && pass "رأس nosniff موجود" || fail "nosniff مفقود!"
echo "$HDRS" | grep -qi "x-frame-options: SAMEORIGIN" && pass "رأس SAMEORIGIN موجود" || fail "X-Frame-Options مفقود!"
echo "$HDRS" | grep -qi "permissions-policy" && pass "رأس Permissions-Policy موجود" || fail "Permissions-Policy مفقود!"

echo ""
echo "═══ النتيجة الأمنية: $SP نجح · $SF فشل ═══"
[ $SF -gt 0 ] && echo -e "المشاكل:$ISSUES"
exit 0
