#!/bin/bash
# محاكاة طلب Server Action من رابط المعاينة العام عبر البروكسي
# Origin خارجي (space-z.ai) + مضيف داخلي — نفس ظروف المستخدم الحقيقية
set -e
URL="http://localhost:81/login"
ORIGIN="https://preview-botid.space-z.ai"
FORWARDED_HOST="internal-abc.fcapp.run"
BOUNDARY="----WebKitFormBoundary7MA4YWxkTrZu0gW"

BODY=$(printf '\r\n--%s\r\nContent-Disposition: form-data; name="email"\r\n\r\nadmin@tech-committee.local\r\n--%s\r\nContent-Disposition: form-data; name="password"\r\n\r\nAdmin@123456\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_REF_1"\r\n\r\n\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_KEY"\r\n\r\nk322013b3cd435326f78d5273217b94da\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:0"\r\n\r\n{"id":"60d2385a98f444b28c005487efe0f7337dee1727c9","bound":"$@1"}\r\n--%s\r\nContent-Disposition: form-data; name="$ACTION_1:1"\r\n\r\n[{"error":"$undefined"}]\r\n--%s--\r\n' "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$BOUNDARY" "$BOUNDARY")

echo "=== POST Server Action عبر البروكسي (81) بمحاكاة رؤوس المعاينة ==="
curl -s -i -X POST "$URL" \
  -H "Origin: $ORIGIN" \
  -H "x-forwarded-host: $FORWARDED_HOST" \
  -H "Content-Type: multipart/form-data; boundary=$BOUNDARY" \
  --data-binary "$BODY" \
  --max-time 15 -o /tmp/action-response.txt -w "HTTP_CODE=%{http_code}\n"
echo "--- RESPONSE HEADERS (first 15) ---"
head -15 /tmp/action-response.txt
echo "--- BODY SNIPPET ---"
tail -c 400 /tmp/action-response.txt | strings | head -8
