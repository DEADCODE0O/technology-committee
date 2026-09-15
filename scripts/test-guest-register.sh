#!/bin/bash
# اختبار تسجيل ضيف كامل عبر agent-browser (Radix selects)
cd /home/z/my-project

ref() { echo "$1" | grep -o 'ref=e[0-9]*' | sed 's/ref=//' | tail -1; }

# 1) الجنس
S=$(agent-browser snapshot -i 2>/dev/null)
G=$(ref "$(echo "$S" | grep 'combobox' | sed -n '2p')")
echo "gender trigger: $G"
agent-browser click @"$G" >/dev/null 2>&1
sleep 1
O=$(agent-browser snapshot -i 2>/dev/null | grep 'option "ذكر"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' | tail -1)
agent-browser click @"$O" >/dev/null 2>&1
sleep 1
echo "✓ gender set"

# 2) الشعبة
S=$(agent-browser snapshot -i 2>/dev/null)
SEC=$(ref "$(echo "$S" | grep 'combobox' | sed -n '3p')")
echo "section trigger: $SEC"
agent-browser click @"$SEC" >/dev/null 2>&1
sleep 1
O2=$(agent-browser snapshot -i 2>/dev/null | grep 'option "نظم المعلومات"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' | tail -1)
agent-browser click @"$O2" >/dev/null 2>&1
sleep 1
echo "✓ section set"

# 3) سؤال الورشة الديناميكي (اختياري لكن نملؤه للاختبار)
S=$(agent-browser snapshot -i 2>/dev/null)
Q=$(ref "$(echo "$S" | grep 'combobox' | sed -n '4p')")
echo "question trigger: $Q"
agent-browser click @"$Q" >/dev/null 2>&1
sleep 1
O3=$(agent-browser snapshot -i 2>/dev/null | grep 'option "نعم"' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' | tail -1)
agent-browser click @"$O3" >/dev/null 2>&1
sleep 1
echo "✓ question set"

# 4) الإرسال
S=$(agent-browser snapshot -i 2>/dev/null)
B=$(echo "$S" | grep 'button "احجز' | grep -o 'ref=e[0-9]*' | sed 's/ref=//' | tail -1)
echo "submit button: $B"
agent-browser click @"$B"
sleep 3

# 5) التحقق من القاعدة
node -e "const {PrismaClient}=require('@prisma/client'); const db=new PrismaClient(); db.registration.findFirst({where:{phone:'01055512399'},select:{source:true,status:true,section:true,fullName:true,grade:true,answers:true}}).then(r=>{console.log('DB RESULT:',JSON.stringify(r)); return db.\$disconnect()})"
