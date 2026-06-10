# إعداد النطق (Google Cloud TTS عبر دالة سوبابيز)

النطق بييجي من **Google Cloud TTS** عن طريق **دالة طرفية على سوبابيز** بتحمل
المفتاح بأمان (المتصفح مايشوفش المفتاح أبداً). المتصفح بيكاش الصوت محلياً (IndexedDB)
فكل كلمة تتولّد مرة واحدة لكل جهاز. التطبيق **يشتغل عادي من غير الإعداد ده**
(بيرجع لصوت المتصفح)، فمفيش حاجة بتتكسر قبل الربط.

---

## المرحلة ١ — تشغيل النطق (بسيطة، من غير قاعدة بيانات)

### ١. سوبابيز (عندك حساب)
من **Project Settings → API** هات: `Project URL` و `anon public key`.

### ٢. Google Cloud TTS
- في https://console.cloud.google.com فعّل **Cloud Text-to-Speech API**.
- اعمل **API key** (يُفضّل تقصره على الخدمة دي). الباقة المجانية كبيرة (حتى ١ مليون حرف/شهر).
- الأصوات الافتراضية: `en-US-Neural2-F` (أمريكي) و`en-GB-Neural2-A` (بريطاني) — غيّرهم في أعلى `supabase/functions/tts/index.ts` لو حبيت.

### ٣. انشر الدالة + اضبط السر (سر واحد بس)
```bash
supabase link --project-ref <PROJECT_REF>
supabase functions deploy tts
supabase secrets set GOOGLE_TTS_API_KEY="<google_api_key>"
```
> مفيش `db push` ولا service-role ولا bucket في المرحلة دي.

### ٤. اربط المتصفح
في `app.js` فوق غيّر:
```js
const SUPA_URL  = "https://<xxxx>.supabase.co";
const SUPA_ANON = "<anon_public_key>";
```
بس كده — النطق هيبدأ ييجي من الصوت الحقيقي، والمتصفح يكاشه. وقبلها يفضل صوت المتصفح.

---

## المرحلة ٢ — لاحقاً: تخزين مشترك على السيرفر (اختياري)
لو حبيت الكلمات تتولّد **مرة واحدة لكل المستخدمين** (مش لكل جهاز) وتتخزّن مركزياً:
1. طبّق `supabase/migrations/0001_pronunciation_cache.sql` (`supabase db push`) — بيعمل الجداول + سلة التخزين.
2. خلّي الدالة تخزّن الصوت في السلة وترجّع رابطه (وتضيف الترجمة المنسّقة) — دي نسخة موسّعة من `synthesizeBase64`.
3. أسرار إضافية: `SB_URL` و `SB_SERVICE_ROLE_KEY`.
> الملفات دي موجودة في الريبو جاهزة للمرحلة دي.

---

## ملاحظات أمان
- المتصفح بيستخدم **anon key** بس؛ مفتاح Google **في الدالة بس، مش في الريبو ولا الفرونت**.
- لو رجعت للتخزين المشترك: مفتاح service-role كمان يفضل سرّياً في أسرار الدالة.

## بديل Azure
لو فضّلت Azure بدل Google، الجزء الوحيد اللي يتغيّر هو `synthesizeBase64()`
(نداء endpoint النطق بتاع Azure بمفتاح الاشتراك + المنطقة، أصوات زي
`en-US-JennyNeural` / `en-GB-SoniaNeural`).
