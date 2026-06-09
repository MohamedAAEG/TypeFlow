# إعداد باك إند النطق (سوبابيز + Google Cloud TTS)

النطق والترجمة بيتولّدوا مرة واحدة لكل كلمة، يتخزّنوا في سوبابيز، وبعدها بييجوا من
الداتا بيز (والمتصفح بيحمّلهم في الكاش وقت تحميل النص). التطبيق **يشتغل عادي من
غير الإعداد ده** (بيرجع لصوت المتصفح والترجمة المجانية) — الإعداد بس بيرفع الجودة.

## ١. مشروع سوبابيز (عندك حساب بالفعل)
من **Project Settings → API** هات:
- `Project URL`
- `anon public key`  → بتتحط في المتصفح (آمنة).
- `service_role key` → **سرية** — للسيرفر بس.

## ٢. فعّل Google Cloud Text-to-Speech واعمل مفتاح
- من https://console.cloud.google.com اعمل مشروع (أو استخدم واحد موجود).
- فعّل **Cloud Text-to-Speech API**.
- اعمل **API key** من APIs & Services → Credentials، ويُفضّل **تقصره على Text-to-Speech API** بس.
- الباقة المجانية كبيرة (حتى ١ مليون حرف/شهر لأصوات Neural2/WaveNet).
- اللهجات جاهزة: `en-US-Neural2-F` (أمريكي) و`en-GB-Neural2-A` (بريطاني) — غيّرهم في أعلى `supabase/functions/tts/index.ts` لو حبيت صوت تاني.

## ٣. طبّق قاعدة البيانات
```bash
supabase link --project-ref <PROJECT_REF>
supabase db push        # يطبّق supabase/migrations/0001_pronunciation_cache.sql
```
> أو الصق محتوى ملف الـ migration في SQL Editor وشغّله.

## ٤. انشر الدالة الطرفية + اضبط الأسرار
```bash
supabase functions deploy tts

supabase secrets set \
  SB_URL="https://<xxxx>.supabase.co" \
  SB_SERVICE_ROLE_KEY="<service_role_key>" \
  GOOGLE_TTS_API_KEY="<google_api_key>"
```

## ٥. اربط المتصفح
في `app.js` فوق، غيّر القيمتين دول:
```js
const SUPA_URL  = "https://<xxxx>.supabase.co";
const SUPA_ANON = "<anon_public_key>";
```
بس كده. أول ما تتحط القيم الصحيحة، النطق + الترجمة هيبدأوا ييجوا من سوبابيز
(والكلمات الجديدة تتولّد من Google وتتخزّن أوتوماتيك)، وقبل كده التطبيق يفضل شغّال
بصوت المتصفح والترجمة المجانية.

## بديل: Azure بدل Google
لو فضّلت Azure، **الجزء الوحيد اللي بيتغيّر هو دالة `synthesize()` في الدالة الطرفية**
(تنادي endpoint النطق بتاع Azure بمفتاح الاشتراك + المنطقة، وأصوات زي
`en-US-JennyNeural` / `en-GB-SoniaNeural`). الباقي زي ما هو.

## ملاحظات أمان
- المتصفح بيستخدم **anon key** بس؛ الكتابة في الجداول والتخزين **محصورة في الدالة**
  عبر service-role key (سياسات RLS بتمنع الكتابة من المتصفح).
- مفتاح Google و service-role **مايتحطّوش في الريبو** — بس في أسرار الدالة.
