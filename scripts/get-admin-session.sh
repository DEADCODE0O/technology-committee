#!/bin/bash
# الحصول على كوكي جلسة أدمن عبر Server Action حقيقي (لأغراض الاختبار الأمني)
set -e
BASE="http://localhost:3000"
BOUNDARY="----WebKitFormBoundarySEC7MA4YWxkTrZu0gW"
HTML=$(curl -s "$BASE/login" --max-time 10)
AID=$(echo "$HTML" | grep -o '"id":"[a-f0-9]*","bound"' | grep -o '[a-f0-9]\{40\}' | head -1)
KEY=$(echo "$HTML" | grep -o 'name="\$ACTION_KEY" value="[^"]*"' | cut -d'"' -f4)

BODY=$(printf '\r\n--%s\r\nContent-Disposition: form-data; name="email"\r\n\r\n%s\r\n--%s\r\nContent-Disposition: form-data; name="password"\r\n\r\n%s\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_REF_1"\r\n\r\n\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_KEY"\r\n\r\n%s\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:0"\r\n\r\n{"id":"%s","bound":"$@1"}\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:1"\r\n\r\n[{"error":"$undefined"}]\r\n--%s--\r\n' \
  "$BOUNDARY" "admin@tech-committee.local" "$BOUNDARY" "Admin@123456" "$BOUNDARY" "$BOUNDARY" "$KEY" "$BOUNDARY" "$AID" "$BOUNDARY" "$BOUNDARY")

RESP=$(curl -s -i -X POST "$BASE/login" \
  -H "Origin: $BASE" \
  -H "Content-Type: multipart/form-data; boundary=$BOUNDARY" \
  --data-binary "$BODY" --max-time 15)

SESSION=$(echo "$RESP" | grep -o 'tc_session=[^;]*' | head -1)
if [ -n "$SESSION" ]; then
  echo "$SESSION" > /tmp/admin-cookie.txt
  echo "✓ ADMIN SESSION: ${SESSION:0:30}..."
else
  echo "✗ فشل الحصول على الجلسة"
  echo "$RESP" | head -5
fi
