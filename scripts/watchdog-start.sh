#!/bin/bash
# تشغيل المراقب كـ daemon (double-fork) — PID في scripts/watchdog-pid.txt
if [ -f /home/z/my-project/scripts/watchdog-pid.txt ]; then
  OLD=$(grep -oE '[0-9]+' /home/z/my-project/scripts/watchdog-pid.txt | head -1)
  if [ -n "$OLD" ] && kill -0 "$OLD" 2>/dev/null; then
    echo "watchdog already running pid: $OLD — skip"
    exit 0
  fi
fi
(
  setsid bash /home/z/my-project/scripts/watchdog.sh >> /home/z/my-project/scripts/watchdog.log 2>&1 < /dev/null &
  echo "watchdog pid: $!" > /home/z/my-project/scripts/watchdog-pid.txt
) &
exit 0
