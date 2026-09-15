# 🚀 دليل النشر — منصة اللجنة التكنولوجية (Vercel + Supabase)

البنية الرسمية: **Vercel (استضافة) + Supabase (قاعدة بيانات + مصادقة + تخزين)**.
المصادقة: **بريد + OTP إجباري للتأكيد** و**الدخول بـ Google** — كلاهما مُدار من Supabase Auth.

> ✅ منذ هذه النسخة: ملف الترحيل كامل (40 جدولاً) ويُطبَّق تلقائيًا بأمر واحد،
> وسكربت `prebuild` يختار مزوّد قاعدة البيانات (PostgreSQL/SQLite) تلقائيًا حسب
> `DATABASE_URL` — لا حاجة لأي تبديل يدوي للمخطط.

---

## نظرة سريعة على البنية

| الطبقة | التقنية | ملاحظات |
|---|---|---|
| الاستضافة | **Vercel** | Next.js serverless — البناء يعمل بأمر `npm run build` مباشرة |
| قاعدة البيانات | **Supabase PostgreSQL** عبر **Prisma** | ترحيل كامل: 40 جدولاً بـ `db:migrate:deploy` |
| المصادقة | **Supabase Auth** | بريد + OTP (رمز 6 أرقام) + Google OAuth |
| الهوية | UUID من `auth.users` | نفسه مفتاح صف `User` في التطبيق |
| الصور | **Supabase Storage** | bucket عام باسم `workshops` |

---

## الخطوة ١ — مشروع Supabase (٥ دقائق)

1. [supabase.com](https://supabase.com) → **New Project** → الاسم `tech-committee` → منطقة قريبة (مثل `Frankfurt`) → كلمة سر قوية للقاعدة → Create.
2. بعدجهاز المشروع، من **Project Settings → API** انسخ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (سري!) → `SUPABASE_SERVICE_ROLE_KEY`
3. من **Project Settings → Database** انسخ (بعد استبدال `[YOUR-PASSWORD]`):
   - **Connection Pooling → Session mode** (منفذ `6543` عبر `pooler.supabase.com`) → `DATABASE_URL`
   - **Connection string → URI** (منفذ `5432`) → `DIRECT_URL`
4. من القائمة الجانبية **Storage → New bucket** → الاسم `workshops` → فعّل **Public bucket**.

## الخطوة ٢ — إعداد المصادقة (OTP + Google) — أهم خطوة

### أ) تفعيل OTP إجباري لتأكيد البريد
1. **Authentication → Providers → Email**:
   - **"Confirm email"**: ✅ **مفعّل** (هذا ما يجعل المنصة ترسل رمز OTP 6 أرقام
     عند التسجيل ويمنع الدخول قبل تأكيده — كما هو مطلوب تمامًا).
   - **"Secure email change"**: مفعّل.
2. **Authentication → Email Templates → Confirm signup** — الصق هذا القالب
   (يعرض **رمزًا من 6 أرقام** بدلاً من الرابط):

   **Subject:**
   ```text
   رمز التحقق من البريد — اللجنة التكنولوجية
   ```
   **Message (Body):**
   ```html
   <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #0c0d12; color: #f4f4f5; padding: 40px 20px; text-align: center;">
     <div style="max-width: 500px; margin: 0 auto; background: #181924; border: 1px solid rgba(201,164,92,0.3); border-radius: 24px; padding: 32px;">
       <h1 style="color: #c9a45c; font-size: 24px; margin-bottom: 8px;">اللجنة التكنولوجية</h1>
       <p style="color: #a1a1aa; font-size: 14px; margin-top: 0;">أهلاً بك معنا! لتأكيد بريدك الإلكتروني وإكمال تفعيل حسابك، استخدم رمز التحقق التالي:</p>
       <div style="margin: 28px 0; background: #0c0d12; border: 2px dashed #c9a45c; border-radius: 16px; padding: 18px;">
         <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #facc15; font-family: monospace;">{{ .Token }}</span>
       </div>
       <p style="color: #71717a; font-size: 12px; line-height: 1.6;">
         هذا الرمز صالح لمدة محدودة. إذا لم تقم بإنشاء حساب في منصة اللجنة التكنولوجية، يمكنك تجاهل هذه الرسالة بأمان.
       </p>
     </div>
   </div>
   ```
3. احفظ **Save Changes**.

> 💡 كيف يعمل المسار في المنصة: الطالب يسجل → يصلته رسالة بالرمز → صفحة
> `/register/verify` تطلب الـ6 أرقام → **لا دخول قبل صحة الرمز** (محاولة الدخول قبل
> التأكيد تحوّله تلقائيًا لنفس صفحة التحقق). إعادة الإرسال متاحة بعد 60 ثانية.
>
> ⚠️ حد البريد المدمج في الخطة المجانية منخفض (~4 رسائل/ساعة تقريبًا). عند
> الإطلاق الفعلي اربط SMTP خاصًا بك من Authentication → SMTP Settings لرفع الحد.

### ب) تفعيل الدخول بـ Google
Google OAuth يُدار **بالكامل من Supabase** — لا مفاتيح في الكود أو Vercel:
1. [console.cloud.google.com](https://console.cloud.google.com) → أنشئ مشروعًا → **OAuth consent screen** (External → اسم التطبيق: «اللجنة التكنولوجية» → Save).
2. **Credentials → Create Credentials → OAuth Client ID** → Web application → أضف في **Authorized redirect URIs**:
   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
3. انسخ **Client ID** و**Client Secret** → **Supabase → Authentication → Providers → Google** → الصقهما → Save.

> زر «الدخول بـ Google» يظهر تلقائيًا في صفحات الدخول والتسجيل، ومستخدم Google
> الجديد يُحوَّل لإكمال بياناته الدراسية ثم لوحته. حسابات الإدارة تدخل بالبريد وكلمة السر فقط.

### ج) روابط العودة (URL Configuration)
**Authentication → URL Configuration**:
- **Site URL**: رابطك على Vercel (مثل `https://tech-committee.vercel.app`)
- **Additional Redirect URLs**: أضف
  `https://اسم-مشروعك.vercel.app/auth/**` و `http://localhost:3000/auth/**`

## الخطوة ٣ — تهيئة القاعدة (أمر واحد)

على جهازك مع ضبط المتغيرات في `.env` (أو مرة واحدة من Vercel عبر Terminal):

```bash
npm install
npm run db:migrate:deploy   # ينشئ الـ40 جدولاً كاملة
npm run db:seed             # حساب SUPER_ADMIN + قواعد النقاط + الشارات
```

ثم رقِّ نفسك إلى مدير أعلى:
```sql
-- من Supabase SQL Editor بعد تسجيل حسابك العادي من /register
update public."User" set role = 'SUPER_ADMIN' where email = '<بريدك-هنا>';
```

> 🧹 **لو جرّبت نشرًا سابقًا فاشلًا** على نفس مشروع Supabase: امسح القاعدة أولًا
> من SQL Editor ثم طبّق الترحيل النظيف:
> ```sql
> drop schema public cascade; create schema public;
> grant usage on schema public to postgres, anon, authenticated, service_role;
> grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
> ```

## الخطوة ٤ — النشر على Vercel

1. **Add New → Project → Import** مستودع GitHub الخاص بالمنصة.
2. (الفحص التلقائي يكفي — لا تغيّر Build Command؛ `npm run build` يتكفل بكل شيء.)
3. **Settings → Environment Variables** — أضف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط Session Pooler (منفذ 6543) من Supabase |
| `DIRECT_URL` | رابط الاتصال المباشر (منفذ 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service_role (سري) |
| `SUPABASE_BUCKET` | `workshops` |
| `AUTH_SECRET` | سر عشوائي 32+ حرفًا (`openssl rand -base64 48`) |
| `NEXT_PUBLIC_SITE_URL` | `https://اسم-مشروعك.vercel.app` |

4. **Deploy** — أول بناء يستغرق ~3-5 دقائق.

## الخطوة ٥ — اختبار ما بعد النشر (٥ دقائق)

```text
1) /register → طالب جديد → تصلك رسالة برمز 6 أرقام → أدخله → لوحة الطالب
2) جرّب الدخول قبل تأكيد الرمز → يُحوَّلك تلقائيًا لصفحة التحقق ✅ (لا دخول بلا OTP)
3) زر «الدخول بـ Google» → إكمال البيانات → لوحة الطالب
4) «نسيت كلمة السر» → بريد استعادة → كلمة جديدة → دخول
5) /admin/login → حسابك المروَّج → أنشئ أول نشاط وجلسة
6) حجز جلسة → QR حضور → نقاط تلقائية
```

---

## أسئلة شائعة

**الرمز لم يصل؟** راجع مجلد Spam، ثم زر «إعادة الإرسال» بعد 60 ثانية. إن تكرر: تحقق من قالب الرسالة (خطوة ٢-أ) وحد SMTP.

**التسجيل يقول «معطل من Supabase»؟** Authentication → Providers → Email → Enable Signup مفعّل.

**خطأ اتصال بالقاعدة على Vercel؟** تأكد أن `DATABASE_URL` هو رابط الـPooler (6543) وليس المنفذ 5432 (المحجوز للترحيلات فقط عبر `DIRECT_URL`).

**أشغل نسخة محلية؟** `cp .env.example .env` واترك `DATABASE_URL` بقيمة SQLite الافتراضية — وضع التطوير يعمل بالكامل بدون Supabase (رمز OTP للتجربة: `123456`).

**ماذا تغيّر في هذه النسخة عن السابقة؟**
- ترحيل قاعدة البيانات أصبح **كاملاً** (40 جدولاً — النسخة السابقة كانت تنشئ 18 فقط وهو سبب انهيار النشر السابق).
- `prebuild` يبدّل مزوّد Prisma تلقائيًا حسب `DATABASE_URL` (لا تحرير يدوي للمخطط).
- مسار رفع صور الأنشطة `/api/admin/upload` أُعيد بناؤه (Supabase Storage إنتاجًا / مجلد محلي تطويرًا).
- `.env` و`db/*.db` لم يعودا يُرفعان إلى GitHub إطلاقًا.
