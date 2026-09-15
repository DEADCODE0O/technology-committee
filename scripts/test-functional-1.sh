#!/bin/bash
# ═══ سلسلة الاختبارات الوظيفية — منصة اللجنة التكنولوجية ═══
# المرحلة 1: الصفحات العامة + الصحة
BASE="http://localhost:3000"
PASS=0; FAIL=0; FAILED=""

check() {
  local name="$1" url="$2" expect="${3:-200}"
  local code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$url" --max-time 10)
  if [ "$code" == "$expect" ]; then PASS=$((PASS+1)); echo "✓ $name ($code)"
  else FAIL=$((FAIL+1)); FAILED="$FAILED\n✗ $name: توقع $expect حصل $code"; echo "✗ $name: توقع $expect حصل $code"; fi
}

echo "═══ 1) الصفحات العامة ═══"
check "الرئيسية" "/"
check "الورش" "/workshops"
check "المتصدرون" "/leaderboard"
check "المواهب" "/talents"
check "دخول الطلاب" "/login"
check "التسجيل" "/register"
check "دخول الإدارة" "/admin/login"
check "نسيت كلمة السر" "/auth/forgot-password"
check "فحص الصحة" "/api"
check "ورشة تفاصيل" "/workshops/cmts04c0p001zqszqoxrw1bp2"
check "QR صورة" "/api/qr?data=test&size=200"

echo ""
echo "═══ 2) حماية المسارات (بدون جلسة) ═══"
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/panel" --max-time 10)
[ "$code" == "307" ] || [ "$code" == "302" ] && { PASS=$((PASS+1)); echo "✓ /panel محمي (تحويل $code)"; } || { FAIL=$((FAIL+1)); echo "✗ /panel غير محمي! ($code)"; }
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin" --max-time 10)
[ "$code" == "307" ] || [ "$code" == "302" ] && { PASS=$((PASS+1)); echo "✓ /admin محمي (تحويل $code)"; } || { FAIL=$((FAIL+1)); echo "✗ /admin غير محمي! ($code)"; }

echo ""
echo "═══ النتيجة: $PASS نجح · $FAIL فشل ═══"
[ $FAIL -gt 0 ] && echo -e "الفاشلة:$FAILED"
exit 0
