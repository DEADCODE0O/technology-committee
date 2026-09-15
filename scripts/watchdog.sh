#!/bin/bash
# المراقب الذاتي (watchdog) — يعمل كل 20 ثانية:
# 1) لو الخادم ميت أو المنفذ 3000 لا يستجيب → يعيد تشغيله من النسخة المجمدة
# 2) لو صفحة الدخول تشير إلى chunks مفقودة (انحراف) → يعيد التشغيل
# 3) يسجل كل حدث في scripts/watchdog.log مع الوقت
# يعالج: إعادة تشغيل البيئة (مثل 04:47) + أي انحراف مستقبلي

LOG=/home/z/my-project/scripts/watchdog.log
FROZEN=/home/z/my-project/prod/server/.next

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG"; }

check_server() {
  local html
  html=$(curl -s -m 8 http://127.0.0.1:3000/login) || return 1
  [ -z "$html" ] && return 1
  # فحص الـ chunks المُشار إليها في HTML الحي مقابل النسخة المجمدة
  local missing=0
  while IFS= read -r c; do
    [ -f "$FROZEN/${c#_next/}" ] || missing=1
  done < <(echo "$html" | grep -oE '_next/static/(chunks|css)/[a-z0-9_-]+\.(js|css)' | sort -u)
  [ "$missing" -eq 0 ]
}

# حذف أي PID قديم ميت قبل البدء
while true; do
  # نافذة سماح بعد الإقلاع (40 ثانية) لتجنب قتل خادم قيد الإقلاع
  NOW=$(date +%s)
  STARTED=$(cat /home/z/my-project/scripts/prod-started-at.txt 2>/dev/null || echo 0)
  GRACE=$((NOW - STARTED))
  if [ "$GRACE" -lt 40 ]; then
    sleep 20
    continue
  fi

  if check_server; then
    : # سليم — لا شيء
  else
    log "PROBLEM: الخادم ميت أو منحرف — إعادة التشغيل من النسخة المجمدة"
    # قتل كل ما يشغل المنفذ 3000 (سواء PID المسجل أو خادم غريب أطلقته المنصة)
    PID=$(grep -oE '[0-9]+' /home/z/my-project/scripts/prod-pid.txt 2>/dev/null | head -1)
    [ -n "$PID" ] && kill -9 "$PID" 2>/dev/null
    fuser -k 3000/tcp 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    sleep 2
    bash /home/z/my-project/scripts/daemon-start.sh
    sleep 8
    if check_server; then
      log "RECOVERED: الخادم عاد للعمل"
    else
      log "FAILED: لم يتعافَ بعد إعادة التشغيل — سيحاول مجددًا"
    fi
  fi
  sleep 20
done
