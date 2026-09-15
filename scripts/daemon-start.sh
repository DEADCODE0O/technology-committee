#!/bin/bash
# خادم الإنتاج من النسخة المجمدة prod/server — منفصلة عن .next تمامًا
# فأي إعادة بناء تلقائية من المنصة (فوق .next) لا تؤثر على الخادم الحي إطلاقًا
# Double-fork daemon: الابن الوسيط يموت فورًا والحفيد يُبنّى لـ PID 1 ويبقى حيًا
# HOSTNAME="::" = ربط ثنائي المكدس (IPv4+IPv6) — ضروري لبروكسي المعاينة

# حماية من التشغيل المزدوج: لو الخادم حي بالفعل لا تفعل شيئًا
if [ -f /home/z/my-project/scripts/prod-pid.txt ]; then
  OLD_PID=$(grep -oE '[0-9]+' /home/z/my-project/scripts/prod-pid.txt | head -1)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "server already running pid: $OLD_PID — skip"
    exit 0
  fi
fi

export PORT=3000 HOSTNAME="::"
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export AUTH_SECRET="bkWm98yAlIlZi/Kdf6QWUcs8d748OldNxbvvR6UywPH+Fk9YqTgHYjnmbw7flU+P"
export NODE_ENV=production
cd /home/z/my-project/prod/server
( # fork ثانٍ: الخادم الفعلي يتيم
  setsid node server.js >> /home/z/my-project/scripts/prod-server.log 2>&1 < /dev/null &
  echo "server pid: $!" > /home/z/my-project/scripts/prod-pid.txt
) &
date +%s > /home/z/my-project/scripts/prod-started-at.txt
exit 0
