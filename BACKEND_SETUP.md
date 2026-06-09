# إعداد باك إند النطق (سوبابيز + أمازون بولي)

النطق والترجمة بيتولّدوا مرة واحدة لكل كلمة، يتخزّنوا في سوبابيز، وبعدها بييجوا من
الداتا بيز (والمتصفح بيحمّلهم في الكاش وقت تحميل النص). التطبيق **يشتغل عادي من
غير الإعداد ده** (بيرجع لصوت المتصفح والترجمة المجانية) — الإعداد بس بيرفع الجودة.

## ١. اعمل مشروع سوبابيز
- من https://supabase.com اعمل مشروع جديد.
- هتحتاج من **Project Settings → API**:
  - `Project URL`
  - `anon public key`  → دي اللي بتتحط في المتصفح (آمنة).
  - `service_role key` → **سرية** — للسيرفر بس.

## ٢. اعمل حساب AWS وفعّل Polly
- اعمل مستخدم IAM بصلاحية `AmazonPollyFullAccess`.
- هات: `AWS_ACCESS_KEY_ID` · `AWS_SECRET_ACCESS_KEY` · المنطقة (مثلاً `eu-west-1`).
- بولي فيه باقة مجانية كبيرة (٥ مليون حرف/شهر أول سنة، وبعدها رخيص).

## ٣. طبّق قاعدة البيانات
نزّل Supabase CLI، وبعدين:
```bash
supabase link --project-ref <PROJECT_REF>
supabase db push        # يطبّق supabase/migrations/0001_pronunciation_cache.sql
```
> أو افتح SQL Editor في لوحة سوبابيز والصق محتوى الملف وشغّله.

## ٤. انشر الدالة الطرفية + اضبط الأسرار
```bash
supabase functions deploy tts

supabase secrets set \
  SB_URL="https://<xxxx>.supabase.co" \
  SB_SERVICE_ROLE_KEY="<service_role_key>" \
  AWS_ACCESS_KEY_ID="<...>" \
  AWS_SECRET_ACCESS_KEY="<...>" \
  AWS_REGION="eu-west-1"
```

## ٥. اربط المتصفح
في `app.js` فوق، غيّر القيمتين دول بقيمك:
```js
const SUPA_URL  = "https://<xxxx>.supabase.co";
const SUPA_ANON = "<anon_public_key>";
```
بس كده. أول ما تتحط القيم الصحيحة، النطق + الترجمة هيبدأوا ييجوا من سوبابيز
(والكلمات الجديدة تتولّد من بولي وتتخزّن أوتوماتيك)، وقبل كده التطبيق يفضل شغّال
بصوت المتصفح والترجمة المجانية.

## ملاحظات أمان
- المتصفح بيستخدم **anon key** بس؛ الكتابة في الجداول والتخزين **محصورة في الدالة**
  عبر service-role key (سياسات RLS بتمنع الكتابة من المتصفح).
- مفاتيح AWS و service-role **مايتحطّوش في الريبو** — بس في أسرار الدالة.
