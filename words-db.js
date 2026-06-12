// ============================================================================
// TypeFlow — Local Words Database
// ============================================================================
// قاعدة البيانات المحلية للمشروع — ملف واحد في نفس مجلد العمل، بدون أي خدمة
// خارجية. التطبيق يقرأ منها أولاً، وما هو غير موجود فيها يسقط تلقائياً على
// الخدمات المجانية (الترجمة السياقية / صوت المتصفح).
//
// البنية:
//   translations[lang][word] = الترجمة المنسّقة للكلمة المفردة
//   audio[word]              = مسار ملف صوت داخل المشروع (مثل "audio/job.mp3")
//                              ضع ملفات mp3 في مجلد audio/ وأضف مسارها هنا
//                              وسيُشغَّل بدلاً من صوت المتصفح.
//
// للإضافة: حرّر هذا الملف مباشرة (الكلمات بحروف صغيرة).
// ============================================================================

const WORDS_DB = {
  version: 1,

  translations: {
    ar: {
      // ---- عام / كلمات شائعة ----
      "the": "الـ (أداة تعريف)",
      "and": "و",
      "is": "يكون",
      "are": "يكونون",
      "you": "أنت",
      "we": "نحن",
      "they": "هم",
      "she": "هي",
      "he": "هو",
      "it": "هو/هي (لغير العاقل)",
      "this": "هذا",
      "that": "ذلك",
      "have": "يملك",
      "has": "يملك (للمفرد)",
      "good": "جيد",
      "new": "جديد",
      "old": "قديم",
      "big": "كبير",
      "small": "صغير",
      "fast": "سريع",
      "important": "مهم",
      "different": "مختلف",
      "interesting": "مثير للاهتمام",
      "difficult": "صعب",
      "beautiful": "جميل",
      "happy": "سعيد",
      "tired": "متعب",
      "early": "مبكر",
      "late": "متأخر",
      "together": "معاً",
      "without": "بدون",
      "between": "بين",
      "during": "أثناء",
      "however": "لكن / ومع ذلك",
      "because": "لأن",
      "time": "وقت",
      "day": "يوم",
      "people": "ناس",
      "world": "عالم",
      "life": "حياة",
      "home": "منزل",
      "morning": "صباح",
      "water": "ماء",
      "friend": "صديق",
      "family": "عائلة",
      "book": "كتاب",
      "read": "يقرأ",
      "write": "يكتب",
      "listen": "يستمع",
      "speak": "يتحدث",
      "practice": "تدريب / يتدرب",
      "language": "لغة",
      "english": "الإنجليزية",
      "word": "كلمة",
      "sentence": "جملة",

      // ---- العمل / فرص العمل ----
      "job": "وظيفة",
      "work": "عمل",
      "boss": "مدير",
      "team": "فريق",
      "task": "مهمة",
      "pay": "أجر / يدفع",
      "hire": "يوظّف",
      "office": "مكتب",
      "email": "بريد إلكتروني",
      "meeting": "اجتماع",
      "report": "تقرير",
      "deadline": "موعد نهائي",
      "skills": "مهارات",
      "skill": "مهارة",
      "resume": "سيرة ذاتية",
      "career": "مسار مهني",
      "salary": "راتب",
      "company": "شركة",
      "manager": "مدير",
      "employee": "موظف",
      "experience": "خبرة",
      "opportunity": "فرصة",
      "market": "سوق",
      "strategy": "استراتيجية",
      "profile": "ملف شخصي",
      "network": "شبكة علاقات",
      "contacts": "جهات اتصال",
      "recruiters": "مسؤولو توظيف",
      "candidates": "مرشحون",
      "promotion": "ترقية",

      // ---- العمل الحر ----
      "client": "عميل",
      "project": "مشروع",
      "invoice": "فاتورة",
      "payment": "دفعة / سداد",
      "remote": "عن بُعد",
      "rate": "سعر / معدل",
      "contract": "عقد",
      "portfolio": "معرض أعمال",
      "deliver": "يسلّم",
      "review": "مراجعة",
      "budget": "ميزانية",
      "freelancer": "مستقل (فريلانسر)",
      "proposal": "عرض عمل",
      "negotiate": "يفاوض",
      "scope": "نطاق العمل",
      "milestone": "مرحلة إنجاز",
      "feedback": "ملاحظات / تقييم",
      "revision": "تعديل",
      "niche": "تخصص دقيق",
      "upfront": "مقدماً",

      // ---- المقابلات ----
      "interview": "مقابلة",
      "preparation": "تحضير",
      "rehearse": "يتمرن / يبروفة",
      "strengths": "نقاط قوة",
      "weaknesses": "نقاط ضعف",
      "achievement": "إنجاز",
      "scenario": "سيناريو",
      "panel": "لجنة",
      "punctual": "دقيق في المواعيد",
      "confident": "واثق",
      "question": "سؤال",
      "answer": "إجابة",

      // ---- الكورسات والتعلم ----
      "course": "كورس / دورة",
      "lesson": "درس",
      "lecture": "محاضرة",
      "video": "فيديو",
      "quiz": "اختبار قصير",
      "teacher": "معلم",
      "student": "طالب",
      "learn": "يتعلم",
      "study": "يذاكر / يدرس",
      "module": "وحدة تعليمية",
      "online": "عبر الإنترنت",
      "certificate": "شهادة",
      "topic": "موضوع",
      "note": "ملاحظة",
      "exam": "امتحان",
      "curriculum": "منهج",
      "enroll": "يسجّل / يلتحق",
      "assignment": "واجب / تكليف",
      "progress": "تقدّم",
      "instructor": "مدرّب / محاضر",
      "syllabus": "خطة المقرر",
      "knowledge": "معرفة",

      // ---- البرمجة والتقنية ----
      "code": "كود / شيفرة",
      "programming": "برمجة",
      "computer": "حاسوب",
      "software": "برمجيات",
      "developer": "مطوّر",
      "website": "موقع إلكتروني",
      "internet": "إنترنت",
      "data": "بيانات",
      "technology": "تقنية",
      "application": "تطبيق"
    }
  },

  audio: {
    // مثال: "job": "audio/job.mp3"
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORDS_DB };
}
