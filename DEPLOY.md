# 🚀 دليل النشر المجاني — منصة اللجنة التكنولوجية

النشر الحالي مبني على (**Vercel + Supabase**) مع إبقاء المصادقة والبيانات والتخزين في Supabase.
النسخة المجانية الحالية تعتمد على **Google OAuth أو Email/Password فقط**؛ لا يوجد SMS OTP في مسار التسجيل.

---

## البنية الرسمية (ما الذي يتغير في هذه النسخة)

| الطبقة | التقنية | ملاحظات |
|---|---|---|
| الاستضافة | **Vercel** | Next.js serverless |
| قاعدة البيانات | **Supabase PostgreSQL** عبر **Prisma** | المصدر الوحيد للحقيقة |
| المصادقة | **Supabase Auth** | بريد + كلمة سر، Google OAuth، استعادة كلمة السر، الجلسات |
| الهوية | UUID من `auth.users` | نفسه مفتاح صف المستخدم في التطبيق |
| الصور | **Supabase Storage** | bucket عام `workshops` |
| الهاتف | حفظ رقم الهاتف فقط | SMS OTP مؤجل لمرحلة لاحقة عند الحاجة |

> ✅ الإنتاج موجّه إلى **Supabase PostgreSQL + Supabase Auth + Supabase Storage + Prisma**.
> لا يوجد اعتماد إنتاجي على SQLite أو نظام Auth مخصص.
> حسابات الطلاب: Google أو Email/Password. حسابات الإدارة تستخدم البريد وكلمة السر.

---

## ما ستحتاجه

- حساب **GitHub** مجاني → [github.com](https://github.com) (لرفع الكود — وسجّل به في الخدمتين التاليتين)
- حساب **Supabase** مجاني → [supabase.com](https://supabase.com) (قاعدة + مصادقة + تخزين)
- حساب **Vercel** مجاني → [vercel.com](https://vercel.com) (الاستضافة)
- (اختياري) حساب **Google Cloud** مجاني → لتفعيل الدخول بـ Google للطلاب

---

## الخطوة ١ — مشروع Supabase (قاعدة + مصادقة + تخزين) — ٥ دقائق

1. افتح [supabase.com](https://supabase.com) → **New Project** → اسمه `tech-committee`
   → منطقة قريبة (مثلاً `Frankfurt`) → كلمة سر قوية لقاعدة البيانات → Create
2. بعد إنشاء المشروع، من **Project Settings → API** انسخ:
   - `Project URL` → سيكون `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → سيكون `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (سري!) → سيكون `SUPABASE_SERVICE_ROLE_KEY`
3. من **Project Settings → Database** انسخ اتصالين (بعد استبدال `[YOUR-PASSWORD]` بكلمة سر القاعدة):
   - **Connection string → URI** (المباشر، منفذ `5432` على `db.<ref>.supabase.co`) → `DIRECT_URL`
   - **Connection Pooling → Session mode** (منفذ `5432` على `pooler.supabase.com`) → `DATABASE_URL`
4. من القائمة الجانبية **Storage → New bucket**:
   - الاسم: `workshops` — ونشّط **Public bucket**

> 💡 حدود الخطة المجانية تتغير مع الوقت؛ راجع صفحة خطط Supabase الحالية قبل فتح المنصة على نطاق واسع.

---

## الخطوة ٢ — إعداد المصادقة داخل Supabase — ٣ دقائق

### أ) الإعدادات الأساسية

1. **Authentication → URL Configuration**:
   - **Site URL**: `https://اسم-مشروعك.vercel.app` (رابطك بعد النشر على Vercel)
   - **Additional Redirect URLs**: أضف
     `https://اسم-مشروعك.vercel.app/auth/**`
     وأيضًا `http://localhost:3000/auth/**` (للتجربة المحلية)
2. **Authentication → Providers → Email**: مفعّل افتراضيًا
   - **"Confirm email"**: فعّله (Enabled) لإلزام الطلاب بتأكيد البريد عبر كود OTP 6 أرقام.
   - **"Secure email change"**: Enabled.

### ج) ضبط قالب كود التحقق (OTP Template) المكون من 6 أرقام

لضمان وصول كود مكون من 6 أرقام للطالب بدلاً من الرابط التقليدي:
1. اذهب إلى **Supabase Dashboard → Authentication → Email Templates**.
2. اختر قالب **Confirm signup**.
3. في خانة **Subject** اكتب:
   ```text
   رمز التحقق من البريد — اللجنة التكنولوجية
   ```
4. في خانة **Message (Body)** الصق هذا القالب المجهز (يدعم متغير `{{ .Token }}` الرسمي من Supabase):
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
5. اضغط **Save Changes**.

---

### د) التحقق من البريد وحظر الإيميلات المؤقتة (Anti-Disposable Protection)
المنصة مزودة تلقائيًا بنظام فحص ذكي للبريد الإلكتروني:
- **المزودات المقبولة**: Google (Gmail), Microsoft (Outlook, Hotmail), Yahoo, Apple (iCloud), Proton, وأي بريد جامعي أو تعليمي رسمي (`.edu`, `.edu.eg`).
- **المحظور تمامًا**: جميع خدمات البريد المؤقت والمهمل (مثل Mohmal, 10MinuteMail, TempMail, Guerrilla, Yopmail, إلخ) لمنع الحسابات الوهمية والتلاعب بالنقاط والشهادات.

### ب) الدخول بـ Google (اختياري لكن موصى به للطلاب)

> Google OAuth يُدار **بالكامل من Supabase** — لا مفاتيح Google في الكود أو Vercel إطلاقًا.

1. [console.cloud.google.com](https://console.cloud.google.com) → أنشئ مشروعًا → **OAuth consent screen**
   (External → اسم التطبيق: «اللجنة التكنولوجية» → Save)
2. **Credentials → Create Credentials → OAuth Client ID** → Web application → أضف في
   **Authorized redirect URIs**:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
3. انسخ **Client ID** و **Client Secret** → **Supabase → Authentication → Providers → Google** → الصقهما → Save

> الطلاب سيرَون زر «الدخول بحساب Google»، وسيكملون بياناتهم الدراسية بعد أول دخول.
> حسابات الإدارة تدخل بالبريد وكلمة السر فقط (للأمان — محظورة من Google).

---

## الخطوة ٣ — رفع الكود على GitHub

```bash
git init
git add .
git commit -m "منصة أنشطة اللجنة التكنولوجية"
git branch -M main
git remote add origin https://github.com/USERNAME/tech-committee-platform.git
git push -u origin main
```

> ⚠️ تأكد أن `.env` غير مرفوع (في `.gitignore` أصلًا — آمن). اختر Private (بيانات طلاب لاحقًا).

---

## الخطوة ٤ — تهيئة قاعدة Supabase

بعد ضبط `DATABASE_URL` و`DIRECT_URL`:

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

ملف الـmigration موجود داخل `prisma/migrations/` ولا يحتاج تبديل SQLite/PostgreSQL.

### إنشاء حساب SUPER_ADMIN

1. سجّل حسابًا عاديًا بالبريد من `/register`.
2. بعد إنشاء الحساب، من Supabase SQL Editor أو Prisma حدّد دوره:

```sql
update public."User"
set role = 'SUPER_ADMIN'
where email = '<بريدك-هنا>';
```

3. سجّل الخروج ثم الدخول إلى `/admin/login`.

## الخطوة ٥ — النشر على Vercel

أضف في Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SITE_URL`.
`AUTH_SECRET` مطلوب فقط لو قررت إبقاء وضع التطوير المحلي القديم؛ لا تعتمد عليه في Supabase Auth.

ثم Deploy. سكربت البناء الحالي هو `prisma generate && next build`.

### Google OAuth

من Supabase → Authentication → Providers → Google ضَع Client ID/Secret،
واجعل Redirect URI في Google هو:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

وفي Supabase URL Configuration أضف رابط التطبيق ومسار `/auth/callback`.

### Storage

أنشئ bucket عام باسم `workshops` للصور وقوالب Excel العامة. ملفات القوالب حساسة من ناحية المحتوى،
لذلك ارفعها عبر الـserver route فقط ولا تضع service role في المتصفح.

## الخطوة ٦ — اختبار قبل الإطلاق

```text
1) Register: الاسم عربي + 3 أسماء، فرقة، شعبة، جنس، هاتف
2) Google: تسجيل → إكمال الملف → العودة للمسار المطلوب
3) Workshop: deadline يغلق الطلاب والضيوف، والإدارة تستطيع الإضافة يدويًا
4) Data Request: إجابة تحفظ في StudentData وتُعاد تعبئتها عند الطلب التالي
5) Excel: تصدير الورشة بفلاتر + تصدير قاعدة الطلاب كاملة بفلاتر
6) Admin: تغيير كلمة السر يعمل عبر Supabase Auth
7) Mobile: راجع 390px وعدم وجود horizontal overflow
```

## بعد النشر — أول ٥ دقائق (اختبار سريع)

1. `/register` → سجّل طالبًا تجريبيًا → وصلك بريد تفعيل؟ (إن كان مفعّلًا) → ادخل → لوحة الطالب
2. جرّب زر **الدخول بـ Google** → أكمل بياناتك الدراسية → لوحة الطالب
3. جرّب **نسيت كلمة السر** → وصل بريد برابط → عيّن كلمة جديدة → ادخل بها
4. `/admin/login` → ادخل بحسابك المروّج → أنشئ أول ورشة (صورة من المكتبة أو رفع مباشر)
5. جرّب: حجز ورشة → QR حضور → +10 نقاط تلقائية

---

## أسئلة شائعة

**طالب نسي كلمة السر؟**
رابط «نسيت كلمة السر؟» في صفحة الدخول يرسل له بريد استعادة تلقائي (Supabase Auth) —
بلا تدخل منك. أو: الإدارة → الطلاب → تعديل → تعيين كلمة سر جديدة.

**عندي حساب Google فقط؟**
يدخل بزر Google مباشرة، ويقدر يعيّن كلمة سر لاحقًا من «ملفي → تغيير كلمة السر».

**ليه مفيش SMS OTP حاليًا؟**
النسخة المجانية تستخدم Google أو Email/Password فقط. توثيق SMS مؤجل لمرحلة لاحقة حتى لا تصبح تكلفة الرسائل شرطًا لفتح المنصة.

**الصور فين بتتخزن؟**
Supabase Storage (bucket `workshops` عام — صور الورش غير حساسة). مجاني حتى 1GB.

**الضيوف بياخدوا نقاط؟**
لا — النقاط والشارات للأعضاء فقط. الضيوف يظهرون في المشاركين والحضور وExcel.

**أشغل نسخة محلية للتطوير؟**
استخدم نفس Supabase project أو مشروع Supabase محلي. المخطط الحالي PostgreSQL دائمًا ولا يوجد أمر لتبديله إلى SQLite.

**حذف مستخدم من Supabase Auth؟**
بياناته التاريخية (تسجيلات/حضور/نقاط) محفوظة للمراجعة — الصف المرتبط بها لا يُحذف
تلقائيًا، وإدراج حساب جديد بنفس البريد يُربط بسجلاته عند الحاجة.

---

## ملخص البنية النهائية

| الطبقة | التقنية | الخطة المجانية |
|---|---|---|
| الاستضافة | Vercel Hobby | كافية لمنصة لجنة جامعية |
| قاعدة البيانات | Supabase Postgres (Prisma) | 500MB |
| المصادقة | Supabase Auth (بريد + Google) | 50K MAU |
| تخزين الصور | Supabase Storage | 1GB |
| الهاتف | رقم محفوظ في ملف الطالب | SMS OTP مؤجل |
| التصدير | ExcelJS على السيرفر | — |

---

## جوجل درايف — استغلال مساحة حسابك (يعمل الآن بلا أي إعداد)

المنصة تدعم روابط جوجل درايف في ثلاثة مواضع:
1. **زر CTA في الإشعارات** — «انضم للجروب» أو «افتح المادة» (رابط واتساب/تليجرام/درايف)
2. **مواد المحاضرات** — لكل محاضرة رابط مواد بزر أنيق (يُكتشف نوعه تلقائيًا)
3. **صورة النشاط** — رابط صورة من درايف يُعرض مباشرة (يتحوّل تلقائيًا لصورة معاينة)

**خطوات مشاركة ملف من درايف حسابك:**
1. ارفع الملف على Google Drive
2. كليك يمين ← «مشاركة» ← «أي شخص لديه الرابط» (Viewer)
3. انسخ الرابط والصقه في المنصة

**مكتبة درايف** (الإدارة ← مكتبة درايف): احفظ الروابط المتكررة مرة واحدة واستخدمها بضغطة
في الإشعارات والمحاضرات.

**الرفع المباشر من المنصة (اختياري لاحقًا):** جاهز هيكليًا — يتطلب إنشاء Google Cloud
OAuth Client وضبط `GOOGLE_DRIVE_CLIENT_ID` و`GOOGLE_DRIVE_CLIENT_SECRET` ثم
تفعيل Google Drive API. حتى ذلك الحين وضع الروابط يعمل بالكامل.

## الإشعارات المهمة (بنر + مركز دائم)

- إرسال: الإدارة ← الإشعارات ← اختر النوع «مهم» (يثبت تلقائيًا)
- يظهر للطالب بنرًا ذهبيًا أعلى لوحته حتى يضغط «تم»
- **يبقى دائمًا** في مركز إشعاراته (قسم «مهم — دائمًا هنا») — يرجع للرابط وقتما شاء
- الاستهداف: فرقات/شعب/جنس/حضور/مواهب/مشاركو تنفيذ محدد + معاينة العدد قبل الإرسال
- CTA: عنوان + رابط (أيقونة واتساب/تليجرام/درايف/نماذج/GitHub/يوتيوب تلقائيًا)

## البنية الجديدة: Program → Activity → Run → Session

- **البرنامج** (اختياري): تصنيف أعلى — 5 برامج افتراضية قابلة للتعديل
- **النشاط**: كورس/ورشة/فعالية — وصف وصورة وبرنامج ثابت
- **التنفيذ/الدفعة**: مواعيد ومقاعد وطلاب مستقلون — عليه التسجيل والنقاط والأسئلة
- **المحاضرة**: لكل تنفيذ — حضور QR مستقل + مواد + رابط بث
- حالة التنفيذ (قادم/جارٍ/منتهٍ) تُشتق من التواريخ تلقائيًا — والسيرفر يحكم دائمًا
- دورة التسجيل المستقلة: فتح/إغلاق/بداية/نهاية + وضع الإغلاق (تاريخ/عدد/أيهما/يدوي)
- تجاوز الإدارة: إضافة بعد الإغلاق أو فوق السعة + ترقية قائمة الانتظار (قابل للتعطيل لكل تنفيذ)
