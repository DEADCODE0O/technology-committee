#!/bin/bash
# اختبار CSRF: Server Action من مصدر خارجي (evil.com) — يجب الرفض
BASE="http://localhost:3000"
BOUNDARY="----WebKitFormBoundarySEC7MA4YWxkTrZu0gW"
EVIL_ORIGIN="${1:-https://evil-attacker.com}"

HTML=$(curl -s "$BASE/login" --max-time 10)
KEY=$(echo "$HTML" | python3 -c "import sys,re; m=re.search(r'name=\"\\\$ACTION_KEY\" value=\"([^\"]+)\"', sys.stdin.read()); print(m.group(1) if m else '')")
AID=$(echo "$HTML" | python3 -c "import sys,re; m=re.search(r'name=\"\\\$ACTION_1:0\" value=\"([^\"]+)\"', sys.stdin.read()); print(m.group(1).replace('&quot;', chr(34)) if m else '')")

BODY=$(printf '\r\n--%s\r\nContent-Disposition: form-data; name="email"\r\n\r\nadmin@tech-committee.local\r\n--%s\r\nContent-Disposition: form-data; name="password"\r\n\r\nAdmin@123456\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_REF_1"\r\n\r\n\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_KEY"\r\n\r\n%s\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:0"\r\n\r\n%s\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:1"\r\n\r\n[{"error":"$undefined"}]\r\n--%s--\r\n' \
  "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$KEY" "$BOUNDARY" "$AID" "$BOUNDARY" "$BOUNDARY")

RESP=$(curl -s -i -X POST "$BASE/login" \
  -H "Origin: $EVIL_ORIGIN" \
  -H "Content-Type: multipart/form-data; boundary=$BOUNDARY" \
  --data-binary "$BODY" --max-time 15)

STATUS=$(echo "$RESP" | head -1 | grep -o '[0-9]\{3\}')
SETCOOKIE=$(echo "$RESP" | grep -ci "set-cookie: tc_session" || true)

echo "حالة الرد: $STATUS"
if echo "$RESP" | grep -q "Invalid Server Actions"; then
  echo "✓ CSRF: الطلب من $EVIL_ORIGIN مرفوض — Invalid Server Actions request"
elif [ "$SETCOOKIE" -gt 0 ]; then
  echo "✗✗✗ CSRF خطير: الطلب من $EVIL_ORIGIN نُفّذ وأُنشئت جلسة!"
else
  echo "△ لم تُنشأ جلسة (حماية غير مباشرة) — الحالة: $STATUS"
fi
