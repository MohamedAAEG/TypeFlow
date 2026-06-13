// grammar-data.js — بيانات "تحديات القواعد" (Grammar Quests)
// يُحمّل كـ <script src="grammar-data.js"></script> قبل app.js (مثل english-data.js).
// يعرّف متغيّراً عامّاً GRAMMAR_QUESTS يقرأه app.js.
//
// تقدّم المستخدم يُحفظ في localStorage تحت المفتاح: "typeflow_grammar_levels"
//   الشكل: { "<questId>": { completed: true, bestScore: 5, lastLevel: 3 }, ... }
//
// كل "تحدٍّ" (زمن) يدعم الرحلة الإجبارية ذات المستويات الثلاثة:
//   concept  → المستوى 1 (الشرح المرئي)
//   practice → المستوى 2 (جمل كتابة، لكل جملة تعليل يظهر فوقها)
//   quiz     → المستوى 3 (أسئلة مع تغذية راجعة للصح والخطأ)

const GRAMMAR_QUESTS = [
  {
    id: "present-simple",          // مفتاح الحفظ في typeflow_grammar_levels
    name_ar: "المضارع البسيط",
    name_en: "Present Simple",
    icon: "⏱️",
    level: "A1",                   // يتماشى مع مفهوم المستويات في التطبيق
    order: 1,
    desc_ar: "الحقائق والعادات والروتين اليومي.",

    /* ===== المستوى 1: الشرح (The Concept) ===== */
    concept: {
      tagline: "نستخدمه للحقائق الثابتة والعادات والأشياء التي تتكرر دائماً.",
      formula: [
        { label: "الإثبات", pattern: "Subject + V1 (+s/es)",          example: "She works every day." },
        { label: "النفي",   pattern: "Subject + do/does + not + V1",   example: "She doesn't work today." },
        { label: "السؤال",  pattern: "Do/Does + Subject + V1 ?",       example: "Does she work here?" }
      ],
      rules: [
        "العادات والروتين: I drink coffee every morning.",
        "الحقائق الثابتة: Water boils at 100°C.",
        "مع he / she / it نضيف s أو es للفعل: he plays، she watches.",
        "أفعال تنتهي بـ (ساكن + y) تتحول y إلى ies: study → studies.",
        "في النفي والسؤال نستخدم do (I/you/we/they) و does (he/she/it)، والفعل يعود مجرّداً."
      ],
      signals: ["always", "usually", "every day", "often", "sometimes", "never"],
      tip: "الـ s تظهر على الفعل في الإثبات فقط؛ وتختفي في النفي والسؤال لأن does تحملها بالفعل."
    },

    /* ===== المستوى 2: الذاكرة العضلية (جمل + تعليل لكل جملة) ===== */
    practice: [
      { text: "I drink coffee every morning.",
        rationale: "عادة يومية متكررة → مضارع بسيط، والفاعل I فلا نضيف s." },
      { text: "She watches TV after dinner.",
        rationale: "الفاعل She، والفعل watch ينتهي بـ ch فنضيف es → watches." },
      { text: "We play football on Sundays.",
        rationale: "عادة متكررة، والفاعل We (جمع) فيبقى الفعل مجرّداً play." },
      { text: "He goes to work by bus.",
        rationale: "الفاعل He، والفعل go ينتهي بـ o فنضيف es → goes." },
      { text: "The sun rises in the east.",
        rationale: "حقيقة ثابتة، والفاعل مفرد the sun فنضيف s → rises." },
      { text: "They do not eat meat.",
        rationale: "نفي مع They → do not + الفعل المجرّد eat (بدون s)." },
      { text: "My brother studies medicine.",
        rationale: "الفاعل مفرد (he)، والفعل study ينتهي بـ ساكن+y فيصبح studies." },
      { text: "Cats like to sleep a lot.",
        rationale: "حقيقة عامة، والفاعل cats (جمع) فيبقى الفعل مجرّداً like." },
      { text: "Does she speak English?",
        rationale: "سؤال مع she → Does + الفاعل + الفعل المجرّد speak (الـ s انتقلت إلى does)." },
      { text: "Water boils at one hundred degrees.",
        rationale: "حقيقة علمية ثابتة → مضارع بسيط، والفاعل water مفرد فنضيف s → boils." }
    ],

    /* ===== المستوى 3: معركة النهاية (أسئلة + تغذية راجعة) =====
       type: "mcq" (اختر الصحيح) أو "fill" (أكمل الفراغ — نص حر)
       mcq:  answer = فهرس الخيار الصحيح
       fill: answer = مصفوفة صيغ مقبولة (يقارَن بعد lowercase/trim/توحيد المسافات) */
    quiz: [
      {
        type: "mcq",
        prompt: "She ____ to school every day.",
        choices: ["go", "goes", "going", "went"],
        answer: 1,
        correctFeedback: "أحسنت! مع she نضيف s/es، فالصواب goes.",
        wrongFeedback: "غير صحيح. القاعدة: مع he/she/it في المضارع البسيط نضيف s/es للفعل، فـ go تصبح goes. (went ماضٍ، و going مضارع مستمر.)"
      },
      {
        type: "fill",
        prompt: "They ____ (not / play) tennis.",
        answer: ["do not play", "don't play"],
        correctFeedback: "ممتاز! النفي مع They = do not / don't + الفعل المجرّد play.",
        wrongFeedback: "تذكّر: النفي = do/does + not + فعل مجرّد. ومع They نستخدم do، فالصواب: do not play (أو don't play) — بدون s على الفعل."
      },
      {
        type: "mcq",
        prompt: "____ he like pizza?",
        choices: ["Do", "Does", "Is", "Did"],
        answer: 1,
        correctFeedback: "صحيح! السؤال مع he يبدأ بـ Does والفعل يبقى مجرّداً.",
        wrongFeedback: "غير صحيح. مع he/she/it نستخدم Does في السؤال (وليس Do)، والفعل يبقى مجرّداً like. (Is لا تصلح مع فعل عادي، وDid للماضي.)"
      },
      {
        type: "fill",
        prompt: "My father ____ (work) in a hospital.",
        answer: ["works"],
        correctFeedback: "رائع! الفاعل مفرد (he) فنضيف s → works.",
        wrongFeedback: "تذكّر: مع he/she/it نضيف s للفعل في الإثبات، فالصواب works وليس work."
      },
      {
        type: "mcq",
        prompt: "We usually ____ dinner at 8.",
        choices: ["has", "haves", "have", "having"],
        answer: 2,
        correctFeedback: "ممتاز! مع we يبقى الفعل مجرّداً → have.",
        wrongFeedback: "غير صحيح. نضيف s فقط مع he/she/it؛ ومع we نستخدم have المجرّد. (لا توجد كلمة haves، ومع المفرد تكون has.)"
      },
      {
        type: "fill",
        prompt: "The baby ____ (cry) at night.",
        answer: ["cries"],
        correctFeedback: "أحسنت! فعل ينتهي بـ ساكن+y مع مفرد → نحذف y ونضيف ies → cries.",
        wrongFeedback: "تذكّر: مع المفرد (he/she/it) والفعل المنتهي بـ ساكن+y نحوّل y إلى ies، فالصواب cries وليس crys أو cry."
      }
    ]
  }

  // تحديات إضافية لاحقاً بنفس الشكل: present-continuous، past-simple ...
];

// إتاحته في النطاق العام (التطبيق Vanilla بلا modules)
window.GRAMMAR_QUESTS = GRAMMAR_QUESTS;
