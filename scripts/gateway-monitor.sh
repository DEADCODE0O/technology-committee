#!/bin/bash
# مراقب بوابة المعاينة الخارجية — يسجل فشل البوابة (وليس التطبيق)
LOG=/home/z/my-project/scripts/gateway.log
while true; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 12 https://preview-chat-000f3acb-237b-4b18-b6d7-1faef953d478.space-z.ai/login 2>/dev/null)
  if [ "$CODE" != "200" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] GATEWAY FAIL: /login → $CODE" >> "$LOG"
  fi
  sleep 60
done
