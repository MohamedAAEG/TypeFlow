// TypeFlow V2.0 - English Learning Content
// Structure: ENGLISH_CONTENT[reasonId][level][size] = [array of paragraph strings]
// Sizes: words (single words/phrases), small (1-2 sentences), medium (3-4), large (full paragraph)
// Levels: A1, A2, B1, B2, C1, C2 (CEFR)

const CEFR_LEVELS = [
  { id: "A1", name_ar: "مبتدئ", name_en: "Beginner", desc_ar: "كلمات وعبارات أساسية", desc_en: "Basic words and phrases" },
  { id: "A2", name_ar: "ابتدائي", name_en: "Elementary", desc_ar: "جمل بسيطة في مواضيع مألوفة", desc_en: "Simple sentences in familiar topics" },
  { id: "B1", name_ar: "متوسط", name_en: "Intermediate", desc_ar: "أفكار واضحة عن الاهتمامات", desc_en: "Clear ideas about interests" },
  { id: "B2", name_ar: "فوق المتوسط", name_en: "Upper Intermediate", desc_ar: "أفكار معقدة بدقة جيدة", desc_en: "Complex ideas with good accuracy" },
  { id: "C1", name_ar: "متقدم", name_en: "Advanced", desc_ar: "طلاقة في مواضيع متخصصة", desc_en: "Fluency in specialized topics" },
  { id: "C2", name_ar: "احترافي", name_en: "Proficient", desc_ar: "إتقان كامل قريب من المتحدث الأصلي", desc_en: "Mastery near native speaker" }
];

const SIZE_OPTIONS = [
  { id: "words",  name_ar: "كلمات",      name_en: "Words",       desc_ar: "تدريب على المفردات الفردية",       icon: "🔤" },
  { id: "chunks", name_ar: "تعابير قصيرة", name_en: "Chunks",     desc_ar: "عبارات جاهزة وتراكيب شائعة",     icon: "🧩" },
  { id: "small",  name_ar: "فقرات صغيرة",  name_en: "Short",      desc_ar: "جملة أو جملتان (≈ 50 حرف)",       icon: "📄" },
  { id: "medium", name_ar: "فقرات متوسطة", name_en: "Medium",     desc_ar: "3-4 جمل (≈ 150 حرف)",             icon: "📃" },
  { id: "large",  name_ar: "فقرات كبيرة",  name_en: "Long",       desc_ar: "فقرة كاملة (≈ 350 حرف)",          icon: "📜" }
];

const REASONS = [
  { id: "jobs",        name_ar: "فرص العمل",        name_en: "Job Opportunities", icon: "💼" },
  { id: "freelance",   name_ar: "العمل الحر",        name_en: "Freelancing",       icon: "🧑‍💻" },
  { id: "interviews",  name_ar: "المقابلات الشخصية", name_en: "Job Interviews",    icon: "🎤" },
  { id: "management",  name_ar: "مصادر الإدارة",     name_en: "Management",        icon: "📊" },
  { id: "promotion",   name_ar: "الترقي الوظيفي",    name_en: "Career Growth",     icon: "📈" },
  { id: "internet",    name_ar: "محتوى الإنترنت",    name_en: "Online Content",    icon: "🌐" },
  { id: "courses",     name_ar: "الكورسات العالمية", name_en: "Global Courses",    icon: "🎓" },
  { id: "ai",          name_ar: "الذكاء الاصطناعي",  name_en: "Artificial Intelligence", icon: "🤖" },
  { id: "research",    name_ar: "الأبحاث العلمية",   name_en: "Scientific Research", icon: "🔬" },
  { id: "programming", name_ar: "تعلم البرمجة",      name_en: "Programming",       icon: "💻" },
  { id: "travel",      name_ar: "سهولة السفر",       name_en: "Easy Travel",       icon: "✈️" },
  { id: "movies",      name_ar: "مشاهدة الأفلام",    name_en: "Watching Movies",   icon: "🎬" },
  { id: "books",       name_ar: "قراءة الكتب",       name_en: "Reading Books",     icon: "📚" },
  { id: "news",        name_ar: "الأخبار العالمية",  name_en: "World News",        icon: "📰" },
  { id: "culture",     name_ar: "ثقافات جديدة",      name_en: "New Cultures",      icon: "🌍" },
  { id: "relations",   name_ar: "علاقات عالمية",     name_en: "Global Relations",  icon: "🤝" },
  { id: "confidence",  name_ar: "الثقة بالنفس",      name_en: "Self Confidence",   icon: "💪" },
  { id: "brain",       name_ar: "تنشيط العقل",       name_en: "Brain Activation",  icon: "🧠" },
  { id: "shopping",    name_ar: "التسوق الإلكتروني", name_en: "Online Shopping",   icon: "🛒" },
  { id: "kids",        name_ar: "تعليم الأبناء",     name_en: "Teaching Children", icon: "👨‍👩‍👧" }
];

// ====================================================================
// Content seeded for: jobs, programming, ai, movies, travel, interviews
// Other reasons use a shared "general" fallback pool until admin adds content.
// Admin panel lets you add more paragraphs per (reason × level × size).
// ====================================================================

const ENGLISH_CONTENT = {

  // ============= JOBS / فرص العمل =============
  jobs: {
    A1: {
      words: ["job", "work", "boss", "team", "task", "pay", "hire", "office", "email", "meeting", "report", "deadline", "skills", "resume", "career"],
      chunks: ["I work here", "send an email", "meet the team", "good job today", "see you tomorrow", "have a meeting", "ask the boss"],
      small: [
        "I work in a small office.",
        "My boss is very kind.",
        "I have a meeting today.",
        "We start work at nine.",
        "The team is happy.",
        "I send emails every day.",
        "My job is easy and fun.",
        "I like my new office.",
        "We have lunch at one.",
        "The work is done now.",
        "I learn new things at work.",
        "My friend got a new job.",
        "We talk about the plan.",
        "The pay is good here.",
        "I help my team a lot.",
        "She is a good worker.",
        "The office is very big.",
        "I read the email now.",
        "He is my new boss.",
        "We finish the task today."
      ],
      medium: [
        "I have a new job. I work in a small office. My team is very nice. We have a meeting every day.",
        "My boss is kind. He helps me a lot. I learn new things every day. I am happy at my job.",
        "I send many emails. I make reports. I talk to my team. The work is not hard.",
        "We start at nine. We have lunch at one. We finish at five. I like my time at work.",
        "The office is big. There are many people. We all work as one team. The job is good.",
        "I want a better job. I work hard every day. I learn new skills. I hope to grow soon.",
        "My friend has a job. She works in a shop. She likes her job. She has nice friends.",
        "Today I have three tasks. First, I read emails. Then I make a plan. Last, I call my team.",
        "I am new at work. I ask many questions. My team helps me. I feel safe and welcome.",
        "We have a big project. The deadline is next week. We work together. We will finish on time.",
        "I write a short report. I send it to my boss. He likes my work. I feel very proud.",
        "My job is in the city. I take the bus every day. The trip is short. I read on the way.",
        "We have a new plan. The boss tells the team. We all listen well. We start the work today.",
        "I have a small desk. I have a new computer. I have many books. I like my work space.",
        "My team is great. We help each other. We share ideas. We finish work fast and well.",
        "I want to learn more. I read books at night. I take a class on Sunday. I grow every week.",
        "Today is a hard day. I have many tasks. I do them one by one. I finish them all at last.",
        "My boss gave me a job. It is a new project. I am happy and a bit shy. I will do my best.",
        "We meet every Monday. We talk about the week. We plan our tasks. We help each other a lot.",
        "I love my job. The team is kind. The work is fun. The pay is fair. I am a lucky person."
      ],
      large: [
        "I have a new job in a small office. I start work at nine in the morning and finish at five. My team is very kind, and my boss helps me every day. I read many emails. I write short reports. I talk with my friends at lunch. I am happy at my new job and I want to learn many new things this year.",
        "My friend Sara got a new job last week. She works in a big shop in the city. She helps people who come to buy. She is nice and she smiles a lot. Her boss likes her work. Sara is happy because the job is easy and the pay is good. She wants to stay there for a long time.",
        "I want a new job this year. My old job is not fun. The hours are long and the pay is low. I read job ads every day. I send my resume to many places. I hope to find a good job soon. I want a job with a kind boss and a happy team.",
        "Today we have a big meeting at work. All the team will come. We will talk about the new plan. My boss will speak first. Then we will share our ideas. I am a bit shy, but I want to talk too. I will say my ideas in a clear way.",
        "I work in a school. I am a new teacher. I have a small class with ten students. They are kind and they listen to me. I plan my lessons every night. I want my class to learn and to be happy. I love my job very much.",
        "My brother started a new job in a hotel. He helps people at the front desk. He gives them keys and answers questions. The work starts early and ends late. He is tired but he is happy. He learns new words every day from the people he meets.",
        "I have a small home office. I work from home three days a week. I have a desk by the window. I have a computer and many books. I make my own tea. I work in silence. I like this way of work very much.",
        "My team has five people. We all do different jobs. Ali makes the plan. Sara writes the emails. I make the reports. Lina talks to the clients. The boss helps us all. We are a small but happy team.",
        "I went to a job fair last week. I saw many companies. I spoke with three of them. I gave them my resume. They asked me about my skills. I felt nervous but I tried my best. I hope one of them will call me back soon.",
        "I changed my job last month. My old job was in a bank. My new job is in a school. The work is very different. The pay is the same. But I am much happier now. I love the children and the kind teachers."
      ]
    },
    A2: {
      words: ["candidate", "interview", "salary", "benefits", "contract", "promotion", "experience", "qualifications", "colleagues", "department", "schedule", "training", "review", "feedback", "responsibilities"],
      chunks: ["apply for a job", "send your resume", "schedule an interview", "negotiate the salary", "sign a contract", "join the team", "meet a deadline", "give a presentation"],
      small: [
        "I am looking for a new job in marketing.",
        "She sent her resume to ten companies last week.",
        "The interview was easier than I expected.",
        "My new contract starts on the first of June.",
        "He asked for a higher salary and a longer holiday.",
        "Our team has a meeting every Monday morning.",
        "I want to improve my skills with online courses.",
        "The deadline for the report is next Friday.",
        "She got a promotion after two years of hard work.",
        "We need to hire two new people this month.",
        "I work from home on Tuesdays and Thursdays.",
        "The office is closed for the public holiday.",
        "He gave a short presentation about the new plan.",
        "I have a lot of experience in customer service.",
        "Please reply to my email by the end of the day."
      ],
      medium: [
        "I applied for a new job last week. The position is in a marketing company. I sent my resume and a short cover letter. They invited me to an interview next Tuesday. I am a little nervous but very excited.",
        "My friend works in a big bank. She started as an assistant three years ago. Now she is a manager. She works hard and she is good with people. The bank pays for her training every year.",
        "We have a new project at work. The deadline is in two weeks. My team meets every morning to talk about the tasks. We share the work fairly. I think we will finish on time if we stay focused.",
        "I had a job interview yesterday. The manager asked many questions about my past work. I told her about my skills and my goals. She was friendly and she explained the job clearly. I hope to hear good news this week.",
        "My company offers free training to all the staff. Last month I took a course in public speaking. It was very useful. Now I feel more confident when I give a short talk to my team.",
        "The new office is in the city center. It is bigger and brighter than the old one. There is a nice kitchen and a quiet room for meetings. Everyone is happy with the change. The trip to work is a little longer for me.",
        "I want to change my job this year. I am tired of working late every night. I want a job with better hours and more time for my family. I am reading many job ads online every weekend.",
        "Our team is very international. We have people from five different countries. We speak English at work because it is the common language. I learn many new words and ideas from my colleagues every week.",
        "Today I sent a report to my boss. I worked on it for three days. I checked every number twice. He replied with a short email. He said the report was clear and useful. I feel proud of my work.",
        "Last month I got a small promotion at my company. My new title is team leader. I now help four other people with their tasks. The job is harder but more interesting. I am learning a lot every day."
      ],
      large: [
        "I started looking for a new job about two months ago. I was not very happy with my old company because the hours were long and the salary was low. I updated my resume and added all my new skills. Then I sent it to about twenty different companies. Three of them called me back, and I went to interviews with all of them. Last week I got an offer from a small but growing tech company. The salary is better and the team seems very kind. I am very excited to start my new chapter next month.",
        "My sister works as a nurse in a large hospital. She finished her studies five years ago and started right away. The work is very hard, and she sometimes works long nights. But she loves her job because she helps many people every day. Last year she got a promotion to head nurse on her floor. Now she also trains the new nurses, and she is very patient with them. She often comes home tired, but she always smiles when she talks about her patients.",
        "Our company has changed a lot in the past year. We hired ten new people, and we moved to a bigger office in the city. The new office has a small gym and a quiet room for breaks. The management also started a training program for everyone. We can take online courses for free and we get one paid hour a week to study. I think these changes have made the team much happier and more productive.",
        "I went to a job fair at my old university last Saturday. There were more than fifty companies there from many different fields. I spoke with people from banks, tech companies, and even a famous design studio. I gave my resume to about ten of them. One company invited me to a real interview the next week. I prepared by reading about the company online and by thinking about good answers to common questions. The interview went well and I am waiting for their answer.",
        "Working from home has changed my life. I used to spend two hours every day in traffic. Now I save that time and I can do other things. I start work at nine, take a short break for lunch, and finish at five. In the evening I read books, go for a walk, or cook dinner with my family. I still meet my team online every morning. The video meetings are short but useful. I hope my company keeps this way of working for a long time.",
        "My boss is one of the best managers I have ever had. She listens carefully when I have a problem and she gives clear advice. She also celebrates small wins with the team. When we finish a hard project, she sends a kind email to everyone. Once a month she invites us for coffee and we talk about our goals and our challenges. Because of her, our team is strong and we trust each other. I hope to be a manager like her one day.",
        "Last year I decided to change my career. I worked in a bank for ten years, but I was not happy. I wanted to do something more creative. I took a six-month online course in graphic design. It was hard to study after work, but I finished it. Then I built a small website with my best designs. I shared it with friends and on social media. After a few months, I got my first paying client. Now I work as a freelance designer and I love my new life.",
        "Our company gives every new person a special two-week training program. In the first week, you learn about the company history, the products, and the rules. In the second week, you work with a small group on a real project. At the end, you give a short presentation to the team. I went through this program last month. It was very useful because I met many people and I learned how the company really works. I felt much more confident on my first day in my real job.",
        "Networking is very important in my field. Every month I try to go to one event where I can meet new people. Sometimes it is a small meetup at a cafe. Other times it is a big conference in a hotel. I talk to people, listen to their stories, and share mine. I always carry a few business cards with me. Last year I got two good job offers from people I met at these events. Networking takes time and energy, but it really opens many doors.",
        "I had a very difficult year at work. My team was very small and we had too many projects. We worked long hours and we were always tired. The boss did not help much. After six months, I started to feel very stressed. I spoke with my doctor and she told me to slow down. I asked for a few days off and I made a clear plan to do less. I also looked for a new job, and three months later I found one. Now I am in a healthier place, and I have learned how to protect my time."
      ]
    },
    B1: {
      words: ["recruitment", "headhunter", "onboarding", "performance", "appraisal", "leadership", "delegation", "stakeholder", "deliverable", "milestone", "negotiation", "compensation", "retention", "promotion", "mentorship"],
      chunks: ["climb the career ladder", "land a dream job", "set clear goals", "build a strong network", "take ownership of a project", "go the extra mile", "think outside the box"],
      small: [
        "She negotiated a strong compensation package before signing the contract.",
        "The company is investing heavily in employee mentorship programs.",
        "Clear deliverables make every project much easier to manage.",
        "He took ownership of the entire onboarding process this quarter.",
        "Our headhunter is one of the best in the industry right now.",
        "Performance reviews happen twice a year in our department.",
        "She built her network by attending every relevant conference.",
        "Strong leadership is the most valuable skill in any workplace.",
        "The team missed an important milestone due to unclear priorities.",
        "Honest feedback helps every professional improve in the long run.",
        "He landed his dream job after years of patient preparation.",
        "Effective delegation allows managers to focus on bigger problems.",
        "Stakeholders expect regular and transparent project updates.",
        "Retention rates improve when employees feel genuinely valued.",
        "Negotiation is a skill that improves with thoughtful practice."
      ],
      medium: [
        "Looking for a job in today's market takes patience and a real strategy. You need a clean resume, a strong online profile, and a good network of contacts. Most recruiters use LinkedIn to find candidates, so it is wise to keep your profile updated and active.",
        "When you start a new role, the first ninety days are critical. Use that time to listen, ask questions, and understand the team culture before suggesting big changes. People will respect you more if you show humility and a real desire to learn.",
        "Salary negotiation makes many people uncomfortable, but it is a normal part of accepting a job offer. Do your research before the conversation. Know the typical range for your role in your city. Ask for a fair number and explain your value with concrete examples.",
        "Remote work has changed the rules of professional life. Many companies now hire across borders and time zones. This opens new opportunities, but it also creates new challenges around communication, collaboration, and work-life balance for everyone involved.",
        "A good mentor can transform your career. They share lessons learned from years of mistakes and successes. They introduce you to new people and new ideas. They also tell you the truth when you need to hear it, even if it is hard to accept.",
        "Performance reviews can feel stressful, but they are a chance to grow. Come prepared with examples of your work and clear goals for the next period. Listen to feedback with an open mind. Ask specific questions about how to improve and what success looks like.",
        "Leadership is not about giving orders. It is about creating an environment where people can do their best work. Great leaders set a clear direction, remove obstacles, and trust their team to deliver. They also celebrate the wins and learn calmly from the failures.",
        "Many young professionals chase promotions too quickly. They focus on the title rather than the skills. A wiser approach is to master your current role completely before moving up. Solid foundations matter more than fast progress in the long run.",
        "Building a personal brand online is now part of the job for many people. A simple blog, a clear LinkedIn profile, or a few thoughtful posts can attract great opportunities. The key is to share real value, not just self-promotion or empty content.",
        "Soft skills often matter more than technical skills in senior roles. Communication, empathy, conflict resolution, and time management decide who gets promoted and who stays stuck. Invest in these areas as seriously as you invest in your technical knowledge."
      ],
      large: [
        "Modern job seekers face a paradox. There are more open positions than ever, and yet many people struggle to find work they truly enjoy. Part of the problem is the application process itself. Companies receive hundreds of resumes for every role, and they rely on software to filter candidates before any human reads them. To stand out, you need a focused resume that uses the right keywords for the job. You also need a strong online presence and, ideally, a personal connection to someone inside the company. The candidates who succeed in this market treat their job search like a project. They set weekly goals, track their progress, and learn from every rejection.",
        "Building a successful career is a long game that requires both patience and clear thinking. In your twenties, the goal is to learn as much as possible from as many situations as possible. Take on stretch projects, work with difficult clients, and accept that you will make many mistakes. In your thirties, you start to specialize and build real expertise in a few areas. By your forties, your network and reputation often matter more than your resume. At every stage, the people who keep growing are the ones who stay curious, ask for honest feedback, and adjust their plans when the world changes.",
        "Workplace culture has become one of the most important factors in how people choose where to work. A few years ago, salary was the main consideration. Today, candidates also ask about flexibility, learning opportunities, mental health support, and the values of the leadership team. Smart companies have responded by investing in these areas, not as perks but as core parts of how they operate. The result is a more competitive market where the best talent goes to the organizations that treat people as full human beings, not just as resources to be used.",
        "The rise of artificial intelligence is reshaping nearly every profession. Tasks that once took hours can now be done in minutes by smart software. This is exciting, but it also creates real anxiety. Many workers wonder if their jobs will still exist in ten years. The honest answer is that some roles will disappear, others will change dramatically, and entirely new jobs will be created. The best response is to focus on skills that machines cannot easily replace: creativity, judgment, emotional intelligence, and the ability to learn quickly when the ground shifts under your feet.",
        "A common mistake young professionals make is staying too long in the wrong job. They tell themselves the situation will improve, or that quitting will look bad on their resume. But years pass, and the same problems remain. If you wake up most mornings dreading work, that is a serious signal that something needs to change. Sometimes the answer is a difficult conversation with your manager. Sometimes it is a transfer to another team. And sometimes the only real answer is to leave and start fresh somewhere new. Your career is too long to spend in a place that drains you.",
        "Negotiating compensation is one of the highest-leverage skills in any career. A small improvement at the offer stage compounds over years of raises and bonuses. Yet most people accept the first number they hear because the conversation feels awkward. The professionals who do best take a different approach. They research the market thoroughly. They wait for the company to commit before naming any number themselves. And they negotiate the entire package, not just the base salary. Bonuses, equity, vacation time, learning budgets, and flexible hours are all on the table if you simply ask politely.",
        "Mentorship and sponsorship are often confused, but they are very different things. A mentor gives you advice based on their experience. They listen to your problems and help you think through difficult decisions. A sponsor goes further. They actively advocate for you in rooms you are not in. They recommend you for important projects and put your name forward for promotions. Both relationships are valuable, but sponsorship has a much bigger impact on your trajectory. Building a sponsor relationship takes time and trust, and it usually grows out of consistently delivering excellent work that makes your sponsor look good.",
        "Burnout is a serious risk in any demanding career. It does not happen suddenly. It builds slowly over weeks and months of overwork, unclear priorities, and a feeling that nothing you do is enough. The warning signs include constant fatigue, loss of interest in things you used to enjoy, and difficulty concentrating on basic tasks. If you notice these signals in yourself, take them seriously. Talk to someone you trust. Take real time off, not just a weekend. And look honestly at what in your work life needs to change. Pushing through burnout almost always leads to a much harder crash later.",
        "Career changes are more common than ever before. The idea of staying in one job or even one industry for forty years is largely gone. People now make multiple major changes across their working lives, and that is healthy. Each change brings new perspectives, new skills, and new networks. The key is to plan transitions carefully. Build savings before you make a leap. Talk to people already in the field you want to enter. Take a course or a side project to test whether the new path really suits you. Made well, a career change can be one of the most renewing decisions of your life.",
        "The most successful professionals I know all share one habit: they invest seriously in their continuing education. They read books in their field. They take online courses on new tools and methods. They attend conferences, even when it costs them personally. They write down what they learn and review their notes regularly. This habit might add only a few percent of improvement each month, but those small gains compound dramatically over a decade. The professional who keeps learning ends up far ahead of equally talented peers who stopped growing once they got comfortable in their first solid job."
      ]
    },
    B2: {
      words: ["meritocracy", "succession", "restructuring", "deliverables", "stakeholders", "scalability", "synergy", "alignment", "accountability", "transparency", "bandwidth", "deprioritize", "leverage", "actionable", "competency"],
      chunks: ["align with stakeholders", "drive measurable impact", "scope a project", "raise the bar", "move the needle", "circle back next week", "take this offline"],
      small: [
        "We need to align all stakeholders before scoping the next phase.",
        "The restructuring created uncertainty across several departments.",
        "Her leadership style emphasizes accountability without micromanagement.",
        "Succession planning is often neglected until it becomes urgent.",
        "Let us deprioritize that initiative until the budget is confirmed.",
        "Transparent communication builds long-term trust within any team.",
        "He has the bandwidth to take on one additional client this quarter.",
        "We must leverage existing relationships before sourcing new partners.",
        "The deliverables for next sprint should be actionable and measurable.",
        "Competency frameworks help teams identify clear growth pathways."
      ],
      medium: [
        "The modern workplace is undergoing a quiet but profound transformation. Traditional hierarchies are giving way to flatter structures where individual contributors are expected to lead initiatives without formal authority. This shift demands a new set of skills, particularly around influence, negotiation, and the ability to build coalitions across organizational lines.",
        "When evaluating a new opportunity, professionals should look beyond the immediate compensation package. The trajectory of the company, the quality of the leadership team, and the room for personal growth often matter more in the long run than a few percentage points on the base salary. A modest cut today can lead to outsized returns five years from now.",
        "High-performing teams share a few characteristics regardless of industry or geography. They have psychological safety, meaning people feel comfortable raising concerns and admitting mistakes. They have clear goals that everyone understands. And they have rituals, such as weekly reviews or quarterly off-sites, that reinforce both performance and connection.",
        "Imposter syndrome affects a remarkable number of accomplished professionals, often the very people who would seem to have no reason for self-doubt. The most effective response is not to wait until the feeling disappears, but to act despite it. Document your accomplishments. Seek honest feedback. And remind yourself that nearly everyone in any room is privately wondering whether they truly belong.",
        "Career capital is built through the deliberate accumulation of rare and valuable skills. The professionals who advance fastest are not necessarily the most talented, but the most strategic about which capabilities they develop. They look for skills that are in growing demand, hard to acquire, and difficult to automate. They invest years in mastering these areas while their peers chase shiny new trends.",
        "Conflict in the workplace is inevitable and, handled well, actually beneficial. The teams that consistently outperform are not those without disagreement, but those that have learned to disagree productively. They separate the people from the problem, focus on shared interests rather than fixed positions, and treat difficult conversations as a normal part of getting work done well.",
        "Managing up is a skill that is rarely taught but enormously valuable. It means understanding what your manager actually needs, communicating in their preferred style, and surfacing problems early rather than hoping they will resolve themselves. Done with integrity, it is not political maneuvering but a form of professional generosity that makes everyone's work easier.",
        "The compensation conversation deserves far more strategic thought than most people give it. Beyond the base salary, modern packages can include equity, bonuses tied to specific milestones, professional development budgets, flexible working arrangements, and even sabbaticals. Each element has different tax implications and different long-term value, and the optimal mix varies by life stage."
      ],
      large: [
        "The notion of a single, linear career path has become increasingly obsolete in an economy defined by rapid change. Where previous generations might have spent decades climbing a well-defined ladder within a single company, today's professionals are more likely to navigate a portfolio of roles, side projects, and even entrepreneurial ventures over the course of their working lives. This shift demands a fundamentally different mindset. Rather than optimizing for stability and gradual promotion, successful professionals now optimize for adaptability and the continuous acquisition of transferable skills. They treat their careers as ongoing experiments, regularly testing new domains, building new networks, and reassessing whether their current trajectory still aligns with their evolving values and ambitions.",
        "Employee engagement has become one of the most studied phenomena in organizational psychology, yet it remains stubbornly difficult to achieve at scale. The data consistently shows that engaged employees are more productive, more innovative, and far less likely to leave their employer. Yet survey after survey reveals that the majority of workers feel disengaged from their daily work. The reasons are complex but converge on a few themes. People want to feel their work matters. They want to know how their efforts connect to a larger purpose. They want managers who treat them as full human beings rather than interchangeable resources. Organizations that take these basic human needs seriously consistently outperform those that treat engagement as a checkbox exercise driven by annual surveys and superficial perks.",
        "The art of giving feedback is one of the most underappreciated skills in professional life. Most managers either avoid difficult conversations entirely or deliver them so harshly that the recipient becomes defensive and learns nothing. The most effective feedback follows a recognizable pattern. It is specific rather than general, focused on behavior rather than character, delivered close in time to the event in question, and framed in terms of impact rather than judgment. It also goes in both directions, with the manager genuinely soliciting the employee's perspective and being willing to update their own views. When feedback becomes a routine, low-stakes part of working together, performance and trust both improve dramatically.",
        "Strategic thinking is often confused with strategic planning, but the two are quite different. Planning produces documents, timelines, and budgets. Thinking produces clarity about what matters and why. The professionals who shape the direction of their organizations are those who can step back from the daily flow of tasks and ask uncomfortable questions about whether the current path still makes sense. They study their industry deeply, looking for patterns and inflection points that others miss. They form clear opinions, defend them rigorously, and revise them when the evidence demands it. This kind of thinking cannot be delegated to consultants or reduced to a framework. It is a personal discipline that compounds over years of consistent practice.",
        "Diversity, equity, and inclusion have moved from peripheral concerns to central business priorities for most major organizations, and for good reason. Decades of research consistently show that diverse teams outperform homogeneous ones on measures of creativity, problem-solving, and financial returns. Yet the implementation of these principles remains uneven. Many programs focus heavily on hiring metrics while neglecting the harder work of building genuinely inclusive cultures where people from underrepresented backgrounds can thrive. The organizations that succeed in this area treat it as a sustained commitment rather than a campaign, building accountability into their leadership systems and acknowledging openly that progress will be gradual, contested, and never finished.",
        "Negotiation is fundamentally about understanding interests rather than positions. When two parties enter a discussion with fixed demands, they often miss creative options that could satisfy both sides. The skilled negotiator spends most of the early conversation listening rather than asserting, probing for what the other party really cares about and why. Often what looks like an irreconcilable disagreement turns out to be a misunderstanding about priorities. The buyer who insists on a lower price may actually care more about payment terms. The candidate who pushes for a higher salary may really want recognition and a clearer path to promotion. Skilled negotiators find these hidden interests and craft solutions that create more value than either party expected.",
        "The economics of attention have come to dominate modern professional life in ways that were nearly impossible to predict twenty years ago. The average knowledge worker is interrupted dozens of times per day by notifications, meetings, and the constant pull of digital communication. This fragmentation has profound consequences for the quality of thinking that gets done. Deep work, the kind of focused effort that produces breakthrough results, requires sustained periods of uninterrupted concentration that have become exceedingly rare. The most productive professionals have responded by treating their attention as a precious and scarce resource. They batch their communication. They block time on their calendars for difficult work. And they accept that being unreachable for stretches is not rudeness but a precondition for doing anything truly valuable.",
        "Personal branding has evolved from a niche concept to a near-universal expectation for senior professionals. Whether you write publicly or not, your colleagues, clients, and potential employers form opinions about who you are and what you stand for based on the digital traces you leave behind. Taking some intentional control over this narrative is no longer optional. The most effective approach is not to manufacture a persona but to articulate honestly the perspectives you have developed through years of work. Share what you have learned. Take clear positions on contested questions in your field. Engage thoughtfully with the work of others. Done with integrity, this practice attracts the right opportunities and the right people, and it also clarifies your own thinking in the process.",
        "The transition from individual contributor to manager is one of the most jarring shifts in a professional career, and many talented people stumble badly when they make it. The skills that earned the promotion become almost irrelevant in the new role. Where once your job was to do excellent work yourself, now your job is to enable others to do excellent work. Where once you were measured by your personal output, now you are measured by the output of your team. This requires letting go of the satisfaction of doing things yourself, learning to give clear direction without micromanaging, and developing the patience to coach people through mistakes you could have avoided in seconds. The managers who make this transition successfully often describe it as the hardest thing they have ever done professionally.",
        "Long-term career success increasingly depends on the deliberate cultivation of optionality. The professionals who weather industry disruptions and personal setbacks most gracefully are those who have built multiple sources of income, multiple networks of relationships, and multiple paths they could pursue if their current one closed. This does not mean diversifying so broadly that you become mediocre at everything. It means making strategic investments outside your primary role, such as a meaningful side project, an active presence in a professional community, or a serious relationship with a mentor in an adjacent field. These investments often feel inefficient in the short term, but they create resilience and opportunity that pay dividends over decades."
      ]
    },
    C1: {
      words: ["meritocratic", "fungible", "asymmetric", "incentivize", "operationalize", "internalize", "synergistic", "headcount", "remit", "purview", "kpis", "okrs", "fiduciary", "discretionary", "incumbent"],
      chunks: ["operationalize the strategy", "internalize the feedback loop", "expand the scope of the remit", "challenge the prevailing assumptions", "navigate competing priorities"],
      small: [
        "The incumbent leadership struggled to operationalize an ambitious new strategy.",
        "Asymmetric information made the negotiation considerably more complex.",
        "Her remit expanded significantly following the recent restructuring.",
        "We must align our OKRs with the broader strategic narrative.",
        "The fiduciary responsibilities of the board cannot be delegated lightly."
      ],
      medium: [
        "Modern organizations operate within increasingly complex systems where causality is difficult to trace and outcomes often diverge significantly from intentions. Effective leaders learn to navigate this ambiguity by building tight feedback loops, distributing decision rights thoughtfully, and cultivating the intellectual humility to revise their convictions when evidence demands it.",
        "The shift toward distributed work has unraveled assumptions that quietly underpinned organizational life for generations. Without the casual encounters of a shared office, deliberate effort is now required to build the relational fabric that previously formed by accident. Companies that have not internalized this reality often discover too late that their culture has eroded.",
        "Performance management systems frequently optimize for legibility rather than insight. Reducing a year of complex work to a single rating produces clean spreadsheets but fails to capture the texture of actual contribution. The most thoughtful organizations are abandoning these rituals in favor of continuous, conversation-based approaches that prioritize learning over judgment.",
        "Career capital compounds in ways that defy intuition. Two professionals with similar starting positions can find themselves on radically different trajectories a decade later, not because of dramatically different talent, but because of small, sustained differences in how they allocate their time, attention, and relational investments across thousands of small daily decisions."
      ],
      large: [
        "The traditional architecture of corporate hierarchy is being quietly dismantled by a confluence of technological, demographic, and cultural forces that few organizations have fully reckoned with. The assumption that strategic direction must flow downward from a small executive cadre through ever-broader layers of middle management has come under sustained pressure from research suggesting that distributed decision-making produces better outcomes in volatile environments. Yet the institutional structures, compensation systems, and status hierarchies built around the old model remain remarkably durable, creating a persistent tension between the rhetoric of empowerment and the lived experience of most knowledge workers. The leaders who navigate this transition successfully tend to share an unusual combination of intellectual humility and strategic conviction. They are willing to relinquish the symbolic trappings of executive authority while remaining clear-eyed about which decisions genuinely require their direct involvement, and they invest sustained effort in building the cultural norms that make distributed authority actually function.",
            "The contemporary discourse around work-life balance often obscures more than it reveals. The framing presumes a clean separation between two distinct domains, when in practice modern professional life has become thoroughly interpenetrated with personal identity, social meaning, and economic survival. The challenge facing most thoughtful workers is not how to balance these domains but how to construct lives where work contributes to rather than detracts from broader human flourishing. This requires a more sophisticated set of questions than simple time allocation. What kinds of work actually energize you over the long run? Which relationships at work deserve genuine investment and which are merely transactional? How do you maintain the cognitive and emotional reserves needed for the people who matter most to you outside the office? The professionals who answer these questions honestly tend to construct careers that look quite different from the conventional path, often involving deliberate trade-offs that their peers find puzzling but that produce a deeper and more sustainable sense of meaning over time."
      ]
    },
    C2: {
      words: ["epistemic", "axiomatic", "heterodox", "fungibility", "subsidiarity", "isomorphic", "agentic", "hegemonic", "performative", "ontological"],
      chunks: ["challenge the axiomatic assumptions", "navigate epistemic uncertainty", "preserve agentic autonomy"],
      small: [
        "Epistemic humility distinguishes seasoned executives from merely confident ones.",
        "Her heterodox framing of the problem unlocked an unexpected resolution."
      ],
      medium: [
        "The fundamental challenge facing senior executives in mature organizations is rarely a deficit of information but rather an excess of weakly correlated signals that resist coherent interpretation. The discipline of distinguishing signal from noise, of holding strong opinions loosely, and of revising one's mental models in response to disconfirming evidence is perhaps the most undervalued executive competency in the contemporary corporate landscape."
      ],
      large: [
        "The professionalization of management as a distinct discipline emerged from a particular historical moment when industrial enterprises grew sufficiently complex to require dedicated coordination roles beyond the reach of any single founder or technical expert. The early twentieth century formalized this development through business schools, consulting firms, and a professional literature that codified what had previously been tacit organizational knowledge. Yet the very success of this professionalization has produced its own pathologies. The transferable techniques that allowed managers to move fluidly across industries have sometimes obscured the deep domain knowledge that distinguishes excellent strategic decisions from merely defensible ones. The most thoughtful contemporary executives have begun to push back against this drift, investing seriously in the substantive realities of their industries rather than relying on the generic frameworks that earlier generations took as nearly sufficient."
      ]
    }
  },

  // ============= PROGRAMMING / تعلم البرمجة =============
  programming: {
    A1: {
      words: ["code", "bug", "file", "save", "open", "run", "stop", "type", "click", "menu", "icon", "screen", "mouse", "input", "print"],
      chunks: ["open the file", "save your work", "run the code", "fix the bug", "click the button", "press enter", "read the error"],
      small: [
        "I open my computer to write code.",
        "Save the file before you close it.",
        "I click the green button to run.",
        "The code has a bug to fix.",
        "I type my name on the screen.",
        "Press enter to send the line.",
        "I read the error in red.",
        "The mouse is next to the keys.",
        "I open a new window now.",
        "The program is small and fast.",
        "I write three lines of code.",
        "The screen shows my name.",
        "I love to learn to code.",
        "The bug is gone at last.",
        "I save my work every hour."
      ],
      medium: [
        "I am learning to code. I open a new file every day. I write a few lines and run the code. Sometimes I see an error. I read it slowly and fix the bug.",
        "Today I made my first program. It prints my name on the screen. I clicked the run button. I saw my name in big letters. I was very happy.",
        "I have a small book about code. I read one page every night. I try the small tasks. Some are easy. Some are hard. I do not give up.",
        "My friend helps me with code. He shows me how to fix bugs. We sit at the same computer. We talk and we laugh. Coding is fun with a friend.",
        "I open the editor. I write a line of code. I press save. I press run. The screen shows the answer. I close the file and take a break.",
        "Coding is like a game. Each task is a small puzzle. You think. You try. You fix. At the end you feel proud. You also learn a new thing.",
        "I have three short tasks today. The first is easy. The second is medium. The third is a little hard. I will do them one by one and ask for help.",
        "My new computer is fast. The code runs in one second. The old one was slow. Now I can work better. I am very happy with my new tool.",
        "I joined a coding class online. The teacher is kind. The class is small. We help each other. Every week I learn one new big thing.",
        "I made a small game. It asks the user a name. Then it says hello with the name. The code is short but it works. I will show my mom tonight."
      ],
      large: [
        "I started to learn to code two months ago. At first it was very hard for me. The screen looked scary with many strange words. But every day I tried for one hour. I watched short videos and I read a small book for beginners. Now I can write simple programs. I can print messages on the screen. I can do small math. I can ask the user a question and get an answer. I am still a beginner but I feel very proud of my progress.",
        "My new hobby is coding. Every night after dinner I sit at my computer for one hour. I open my editor and I work on a small project. Last week I made a program that adds two numbers. This week I am making a program that asks the user for a name. Next week I want to learn how to save data in a file. The journey is long but each small step is very fun.",
        "I have a small coding club at school. We meet every Friday after class. There are six of us. The teacher gives us a small task. We try to solve it in groups. Sometimes we share ideas. Sometimes we draw on the board. At the end of the day we run our code. We are proud when it works."
      ]
    },
    A2: {
      words: ["variable", "function", "loop", "array", "object", "string", "number", "boolean", "syntax", "compile", "debug", "framework", "library", "version", "repository"],
      chunks: ["declare a variable", "call a function", "loop through an array", "throw an error", "commit your changes", "push to the remote", "open a pull request"],
      small: [
        "I declared a variable to store the user name.",
        "The function returns the sum of two numbers.",
        "Use a loop to repeat the action ten times.",
        "I fixed the bug in the login function.",
        "Always save your work before closing the editor.",
        "He pushed his code to the shared repository.",
        "The new version has many helpful features.",
        "Read the error message before asking for help.",
        "I learned a new framework this weekend.",
        "Comments make the code easier to read later."
      ],
      medium: [
        "I am learning Python in my free time. Last week I finished a course on basic syntax. Now I am working on a small project. It is a simple to-do list that runs in the terminal. I add tasks and mark them as done. It is not perfect but it works.",
        "Bugs are a normal part of coding. Every developer faces them every day. The trick is to stay calm and read the error message slowly. Most bugs are small and easy to fix once you understand the cause. The more bugs you fix, the faster you become.",
        "Working with a team teaches you a lot about software. You learn to write clean code that other people can read. You learn to use Git to share your changes. You learn to ask for help and to give feedback in a kind way. These skills are as important as the code itself.",
        "I use online forums to learn new things every week. When I have a problem, I search first to see if someone else had the same one. Often I find a clear answer in a few minutes. When I do not find it, I post my own question and wait for kind people to reply."
      ],
      large: [
        "Learning to code in the modern world is easier than it has ever been, and harder at the same time. It is easier because there are thousands of free courses, friendly communities, and powerful tools available to anyone with an internet connection. It is harder because the field has grown so vast that it can be very difficult to know where to start. My advice for beginners is to pick one language and stick with it for at least three months. Build small projects every week, even if they are silly. Share your code with others and ask for honest feedback. Slowly but surely, the strange will become familiar.",
        "Open source software has changed the world in ways that are hard to fully appreciate. Tools that millions of people use every day, from web browsers to operating systems, were built by volunteers who shared their work freely. As a learner, you can read this code, study how it works, and even contribute back when you are ready. There is no faster way to grow as a developer than to spend time inside a well-written open source project. You learn not just syntax, but the deeper questions of design, testing, and collaboration."
      ]
    },
    B1: {
      words: ["algorithm", "complexity", "abstraction", "encapsulation", "inheritance", "polymorphism", "asynchronous", "concurrency", "scalability", "refactoring", "deployment", "container", "middleware", "pipeline", "regression"],
      chunks: ["refactor the legacy code", "ship the feature behind a flag", "write a unit test", "review the pull request", "merge to main", "roll back the deployment"],
      small: [
        "Refactoring legacy code is rarely glamorous but always valuable.",
        "Always write a test before you fix the bug that revealed it.",
        "Premature optimization is the root of many engineering headaches.",
        "Continuous integration catches regressions before they reach production.",
        "Code reviews are conversations about design, not just syntax checks."
      ],
      medium: [
        "Modern software engineering is fundamentally a collaborative discipline. The lone genius writing brilliant code in isolation is largely a myth. Real systems are built by teams over many years, and the skills that matter most are clear communication, careful design, and the patience to write code that other people can understand and maintain.",
        "Choosing the right level of abstraction is one of the central challenges of software design. Too little abstraction and your code becomes verbose and repetitive. Too much and it becomes mysterious, with simple operations hidden behind layers of indirection. The skilled engineer learns to find the level that matches the actual complexity of the problem at hand.",
        "Testing is often treated as an afterthought, but it deserves serious investment. Good tests serve as living documentation of how your code should behave. They give you confidence to refactor without fear of breaking things. And they catch regressions before they cause embarrassment in production. The hours spent writing tests usually save many more hours of debugging later.",
        "Version control is the single most important tool in a modern developer's workflow. Git in particular has become the universal standard, and a deep understanding of how it works pays dividends throughout your career. Beyond the basic commands, learn how to write good commit messages, how to use branches effectively, and how to navigate the history when you need to understand why a change was made."
      ],
      large: [
        "The art of software design is fundamentally about managing complexity. As systems grow, the number of interactions between components grows much faster, and what was once a clean architecture can quickly become a tangled mess that resists change. The senior engineers who shape successful long-term projects are those who learn to spot this growth early and apply the right techniques to keep the complexity in check. They draw clear boundaries between modules. They make dependencies explicit rather than implicit. They write code that reveals its intent at first reading rather than requiring careful study. None of these practices are glamorous, but they accumulate over years into the difference between systems that can grow gracefully and systems that eventually collapse under their own weight.",
        "Debugging is a skill that improves dramatically with deliberate practice, yet most developers never study it formally. The fundamental insight is that debugging is a scientific process. You form a hypothesis about what is wrong, you design an experiment to test it, you observe the result, and you update your understanding based on the evidence. The novice tends to make small random changes hoping something will work. The expert reads the code carefully, considers what could possibly cause the observed behavior, and uses tools like debuggers, logs, and unit tests to gather evidence systematically. Over time, this disciplined approach makes even very difficult bugs tractable.",
        "Software architecture decisions made early in a project shape every later decision in ways that are easy to underestimate. Choosing the wrong database, the wrong communication pattern between services, or the wrong abstraction for your core domain can create a tax that you pay every day for years. Yet making these decisions perfectly is impossible because you cannot know in advance what your system will actually need to do. The pragmatic response is to make decisions that are reversible when possible, to delay irreversible ones until you have the information you need, and to invest in clear interfaces that allow you to swap out implementations as your understanding deepens."
      ]
    },
    B2: {
      words: ["idempotent", "consistency", "throughput", "latency", "observability", "instrumentation", "circuit-breaker", "backpressure", "telemetry", "sharding"],
      chunks: ["instrument the critical path", "design for failure modes", "preserve idempotency guarantees"],
      small: [
        "Distributed systems require careful reasoning about consistency and availability.",
        "Observability is not an optional feature once your system grows beyond a single host."
      ],
      medium: [
        "Building reliable distributed systems is fundamentally an exercise in reasoning about partial failure. In a single-process program, code either runs or it does not. In a distributed system, requests may succeed, fail, time out, or succeed in ways that the caller never learns about. Designs that ignore these realities tend to work beautifully in development and fail mysteriously in production."
      ],
      large: [
        "The discipline of software engineering has matured considerably over the past two decades, with practices like continuous deployment, infrastructure as code, and observability moving from niche curiosities to industry standards. Yet many organizations still struggle to operationalize these ideas effectively. The technology is rarely the limiting factor. The harder work involves changing the social systems around the code, including how teams are structured, how decisions are made, and how risk is communicated to the broader business. The companies that have done this work most successfully tend to share certain cultural traits. They treat outages as learning opportunities rather than failures to punish. They invest heavily in the tools and platforms that make safe experimentation possible. And they trust their engineers to make sound technical judgments without constant approval from distant authorities."
      ]
    },
    C1: { words: [], chunks: [], small: [], medium: [], large: [] },
    C2: { words: [], chunks: [], small: [], medium: [], large: [] }
  },

  // ============= AI / الذكاء الاصطناعي =============
  ai: {
    A1: {
      words: ["robot", "smart", "data", "chat", "ask", "answer", "learn", "model", "voice", "image", "help", "tool", "fast", "new", "future"],
      chunks: ["ask the AI", "smart robot", "talk to the bot", "learn from data", "in the future"],
      small: [
        "AI can help us with simple tasks.",
        "I asked the bot a question.",
        "The robot is very smart now.",
        "AI tools learn from data.",
        "I use a chat bot to learn English.",
        "The voice is calm and clear.",
        "AI helps doctors and teachers.",
        "I see new AI tools every week.",
        "The model is small but fast.",
        "AI will change our lives a lot."
      ],
      medium: [
        "AI is a tool that learns from data. We give it many examples. Then it can do new things on its own. It is not magic but it is very useful.",
        "I use a small AI app every day. It helps me write better emails. It checks my words. It gives me ideas. The app is fast and easy to use.",
        "AI can talk to us now. It uses our voice. It gives us answers in seconds. My mom uses it to ask about the weather. She loves the new helper.",
        "Robots use AI to see and move. They learn from many pictures. Then they can walk in a room. Some robots help in hospitals. Some help in homes."
      ],
      large: [
        "AI is changing the way we live, work, and learn. Many people use AI tools every day without thinking about it. The phone in your pocket uses AI to suggest words when you type. Your map app uses AI to find the fastest road. Your camera uses AI to make your photos look better. These small helpers are everywhere. They make many tasks easier and faster. But we also need to think carefully about how we use them. AI is only as good as the data it learns from, and not all data is fair or correct."
      ]
    },
    A2: {
      words: ["machine learning", "neural network", "training", "dataset", "prediction", "accuracy", "bias", "automation", "chatbot", "recommendation", "computer vision", "natural language", "deep learning", "supervised", "unsupervised"],
      chunks: ["train a model", "improve the accuracy", "remove the bias", "automate the task", "fine-tune the system"],
      small: [
        "The chatbot can answer many simple questions instantly.",
        "Training a good model requires a large amount of clean data.",
        "Bias in training data leads to unfair predictions.",
        "AI is changing how we shop, learn, and work.",
        "She uses an AI tool to translate documents quickly."
      ],
      medium: [
        "Machine learning is a branch of AI where computers learn from examples. Instead of writing strict rules, we show the computer many cases. The system finds patterns and uses them to make decisions about new situations. This approach now powers many tools we use every day.",
        "AI is transforming education in interesting ways. Smart tutoring systems can adapt to each student's level. They give harder questions when the student is ready and easier ones when help is needed. Teachers use these tools to support large classes more effectively.",
        "There are good reasons to be careful about AI. The systems can sometimes make confident-sounding mistakes. They can also reflect biases that exist in their training data. Users should treat AI suggestions as helpful starting points rather than final answers.",
        "Many companies now use AI in customer service. A chatbot handles the simple questions any time of day. When a question is too complex, the system transfers the customer to a human agent. This combination saves time for everyone involved."
      ],
      large: [
        "Artificial intelligence has moved from research labs into everyday life remarkably quickly. Just a few years ago, talking to a computer felt like science fiction. Today, millions of people have natural conversations with AI assistants on their phones, computers, and smart speakers. These systems can write essays, suggest recipes, translate languages, and even help with simple coding tasks. The pace of progress has surprised even the experts who built the original technology. As AI becomes more capable, important questions arise about how we should use it responsibly. Schools are rethinking how they teach writing. Companies are rethinking which jobs will look very different in the future. These are not easy questions, but they are essential for societies to address thoughtfully."
      ]
    },
    B1: {
      words: ["transformer", "embedding", "fine-tuning", "inference", "tokenization", "hallucination", "alignment", "interpretability", "generative", "reinforcement", "benchmark", "modality", "prompt", "agentic", "guardrails"],
      chunks: ["fine-tune on domain data", "evaluate on a benchmark", "detect hallucinations", "design effective prompts"],
      small: [
        "Fine-tuning a pre-trained model is often more practical than training from scratch.",
        "Hallucinations remain one of the central challenges in deploying language models.",
        "Effective prompt design can dramatically improve the quality of model outputs."
      ],
      medium: [
        "Large language models have rapidly become foundational technology, reshaping fields from customer support to scientific research. Their fluency can be deceiving, however. They produce confident text even when their underlying knowledge is uncertain or wrong, making careful evaluation essential before deploying them in any consequential setting.",
        "Building AI systems responsibly involves more than getting the technology to work. It requires thinking carefully about who could be harmed, what failures would look like in practice, and what safeguards should be in place. These considerations often matter more than the headline accuracy numbers that get reported in papers."
      ],
      large: [
        "The recent explosion of generative AI has touched nearly every industry, often in ways that were difficult to predict even a year in advance. Writers use it to overcome blank-page paralysis. Designers use it to explore visual concepts rapidly. Programmers use it to draft routine code and explain unfamiliar codebases. Scientists use it to summarize literature and suggest hypotheses. The pattern across all these applications is the same. AI is most useful as a collaborator that handles the tedious or formulaic parts of work, freeing humans to focus on the judgment, creativity, and ethical reasoning that only people can provide. The professionals who learn to work fluently with these tools are quietly gaining an enormous advantage over those who dismiss them as hype or fear them as threats."
      ]
    },
    B2: { words: [], chunks: [], small: [], medium: [], large: [] },
    C1: { words: [], chunks: [], small: [], medium: [], large: [] },
    C2: { words: [], chunks: [], small: [], medium: [], large: [] }
  },

  // ============= MOVIES / مشاهدة الأفلام =============
  movies: {
    A1: {
      words: ["film", "actor", "scene", "watch", "movie", "show", "song", "fun", "sad", "happy", "story", "hero", "play", "see", "love"],
      chunks: ["watch a film", "love this song", "good movie", "happy ending", "see you soon"],
      small: [
        "I love to watch funny films.",
        "The movie was very sad.",
        "He is a famous actor.",
        "The song is in the film.",
        "We watch a movie every Friday.",
        "The hero saves the day.",
        "I cried at the end.",
        "The story is very old.",
        "My sister loves love stories.",
        "The film is two hours long."
      ],
      medium: [
        "Last night I watched a great film. It was about a young boy who lost his dog. He looked everywhere in the city. At the end, he found the dog at a friend's house. I cried a little but I was happy.",
        "I love to watch movies on the weekend. I make a big bowl of popcorn. I sit on the sofa. I turn off the lights. The film starts and I forget my busy week."
      ],
      large: [
        "My family loves movie night. Every Friday after dinner, we choose a film together. Sometimes it is a kid movie. Sometimes it is a love story. Sometimes it is a funny show. We make popcorn and we sit on the big sofa. We turn off all the lights. We watch the film together. At the end, we talk about the parts we liked. Movie night is my best time of the week."
      ]
    },
    A2: {
      words: ["director", "soundtrack", "subtitle", "trailer", "review", "genre", "plot", "character", "sequel", "remake", "blockbuster", "indie", "documentary", "animation", "streaming"],
      chunks: ["watch the trailer", "read a review", "binge a series", "love the soundtrack", "follow the plot"],
      small: [
        "I watched the trailer three times before the movie came out.",
        "The soundtrack of the film stayed with me for days.",
        "Subtitles help me catch every line of dialogue.",
        "Most sequels rarely live up to the original film.",
        "Indie movies often tell more interesting stories than big studio films."
      ],
      medium: [
        "Streaming services have changed how we watch movies. Years ago, we waited in line for a ticket. Now we choose from thousands of films at home. We can pause, rewind, and start a new movie any time. The choice is huge, which is sometimes a problem in itself.",
        "Documentaries are one of my favorite genres. A good documentary teaches you about real people and real events. You feel like you traveled somewhere or met someone new. The best documentaries change how you see the world long after the credits roll."
      ],
      large: [
        "The way we experience cinema has been transformed by the rise of streaming platforms. Going to the theater used to be a special event that required planning a date, a time, and a place. Now we can summon a feature film at any moment from our living rooms or even our phones. The convenience is undeniable, but something has also been lost. The shared experience of watching a story unfold with hundreds of strangers in a dark room is genuinely different from watching alone on a small screen with the lights on and the phone nearby. The best films still feel more powerful in a theater, where the size of the image and the quality of the sound match the ambition of the storytelling."
      ]
    },
    B1: { words: [], chunks: [], small: [], medium: [], large: [] },
    B2: { words: [], chunks: [], small: [], medium: [], large: [] },
    C1: { words: [], chunks: [], small: [], medium: [], large: [] },
    C2: { words: [], chunks: [], small: [], medium: [], large: [] }
  },

  // ============= TRAVEL / سهولة السفر =============
  travel: {
    A1: {
      words: ["trip", "bag", "map", "hotel", "room", "key", "city", "bus", "taxi", "plane", "train", "food", "park", "shop", "fun"],
      chunks: ["have a trip", "book a hotel", "take a taxi", "see the city", "buy a ticket"],
      small: [
        "I take a trip every summer.",
        "My bag is small and light.",
        "The hotel is near the beach.",
        "I lost my room key.",
        "The taxi was very fast.",
        "We took the bus to the park.",
        "I want a window seat please.",
        "The food in this city is great.",
        "We see a new shop every day.",
        "The trip was short but fun."
      ],
      medium: [
        "I went to a new city last week. I stayed in a small hotel. The room was clean and quiet. I had a great time. I want to go back soon.",
        "We took the train to the next city. The trip was three hours. I read a book. I watched the green fields. I drank a coffee. It was a calm day."
      ],
      large: [
        "Last summer my family took a trip to a small island. We took a plane and then a boat. The trip was long but the place was beautiful. The water was blue. The sand was white. We swam every morning. We ate fresh fish every night. We met kind people from many countries. We stayed for one week. When we came home, we were tired but very happy. We are already saving for next year."
      ]
    },
    A2: { words: ["itinerary", "reservation", "luggage", "passport", "customs", "boarding pass", "layover", "destination", "souvenir", "currency", "departure", "arrival", "guidebook", "landmark", "hostel"], chunks: ["book a flight", "go through customs", "check in at the hotel", "miss the connection", "exchange currency"], small: [], medium: [], large: [] },
    B1: { words: [], chunks: [], small: [], medium: [], large: [] },
    B2: { words: [], chunks: [], small: [], medium: [], large: [] },
    C1: { words: [], chunks: [], small: [], medium: [], large: [] },
    C2: { words: [], chunks: [], small: [], medium: [], large: [] }
  },

  // ============= INTERVIEWS / المقابلات الشخصية =============
  interviews: {
    A1: {
      words: ["question", "answer", "ready", "smile", "calm", "shake", "hand", "speak", "listen", "thank", "hello", "name", "study", "skill", "wait"],
      chunks: ["shake hands", "tell me about yourself", "thank you for your time", "I have a question", "I am ready"],
      small: [
        "I have an interview today.",
        "I will smile and stay calm.",
        "Tell me about your last job.",
        "What is your strongest skill?",
        "I am ready for the meeting.",
        "Thank you for your time today.",
        "I listen to every question well.",
        "I speak in a clear soft voice.",
        "I wear my best clothes.",
        "I shake hands at the start."
      ],
      medium: [
        "I have a job interview tomorrow. I am a little scared but also happy. I will sleep well tonight. I will wake up early. I will wear my best clothes. I will smile and stay calm.",
        "The interview was easier than I thought. The manager was kind. She asked simple questions about my past work. I gave clear short answers. At the end, she said she will call me next week."
      ],
      large: [
        "Last week I had my first real job interview. I was very nervous the night before. I could not sleep well. In the morning I had a small breakfast and a hot tea. I wore my best clothes and I left home early. I arrived at the office twenty minutes before the time. I sat in the waiting room and tried to stay calm. The manager came out with a big smile. She shook my hand and led me to her office. The interview took thirty minutes. She asked about my past jobs and my goals. I tried to give honest and clear answers. At the end she thanked me and said she will call me next week. I left the office feeling proud of myself."
      ]
    },
    A2: { words: ["preparation", "rehearse", "strengths", "weaknesses", "achievement", "scenario", "behavioral", "panel", "follow-up", "punctual"], chunks: ["prepare for the interview", "give a clear example", "ask a smart question", "send a follow-up email"], small: [], medium: [], large: [] },
    B1: { words: [], chunks: [], small: [], medium: [], large: [] },
    B2: { words: [], chunks: [], small: [], medium: [], large: [] },
    C1: { words: [], chunks: [], small: [], medium: [], large: [] },
    C2: { words: [], chunks: [], small: [], medium: [], large: [] }
  }
};

// ====================================================================
// GENERAL FALLBACK CONTENT — used for reasons that have empty buckets
// Until admin adds reason-specific content, users still get something to practice.
// ====================================================================

const GENERAL_FALLBACK = {
  A1: {
    words: ["the", "and", "is", "are", "you", "we", "they", "she", "he", "it", "this", "that", "have", "has", "good", "new", "old", "big", "small", "fast"],
    chunks: ["good morning", "thank you very much", "see you later", "have a nice day", "how are you"],
    small: [
      "The sun is bright today.",
      "I like to read a good book.",
      "We eat lunch at one o'clock.",
      "My family lives in a small town.",
      "The cat sleeps on the warm bed.",
      "She walks to school every day.",
      "We meet our friends on Friday.",
      "I drink tea every morning.",
      "The new shop is on this street.",
      "He plays football with his team."
    ],
    medium: [
      "I wake up at seven in the morning. I drink a glass of water. I get ready for the day. I have a small breakfast. Then I go to work.",
      "My friend lives in a big city. She works in a small office. She likes her job. She has many kind friends. She is very happy.",
      "We go to the park on Sunday. The kids play on the swings. We eat sandwiches under a tree. The day is sunny and warm. We come home tired but happy.",
      "I love to read books at night. I sit in a soft chair. I drink a cup of tea. I read for one hour. Then I sleep with a calm mind.",
      "The dog runs in the green field. He chases the ball. He brings it back to me. We play for a long time. Then we walk home together.",
      "I am learning a new language. I study a little every day. I write new words in a notebook. I listen to short songs. It is slow but it is fun.",
      "My mother makes the best food in the world. She cooks every day. She uses fresh things from the market. The food smells so good. I am very lucky.",
      "We had a small party at home. We invited five friends. We played music and we danced. We ate a big cake. We laughed for hours. It was a great night.",
      "I love quiet mornings. The house is silent. I drink my coffee slowly. I read the news. I think about the day. Then I start my work with a clear head.",
      "Today is a good day. The weather is nice. I feel calm and strong. I have a small plan for the day. I will do my best with a happy heart."
    ],
    large: [
      "Every morning I wake up at seven o'clock. I drink a big glass of cold water. I open the window and breathe in the fresh air. Then I make a small breakfast with bread, cheese, and tea. I read the news for ten minutes. I get dressed and walk to work. The walk takes about twenty minutes. I pass a small park, a coffee shop, and a flower seller. The morning routine helps me start the day with a calm and clear mind. I am very thankful for these simple moments."
    ]
  },
  A2: {
    words: ["important", "different", "interesting", "difficult", "beautiful", "happy", "tired", "early", "late", "together", "without", "between", "during", "however", "because"],
    chunks: ["it is important to", "as soon as possible", "by the way", "in my opinion", "for example"],
    small: [
      "It is important to drink enough water every day.",
      "She decided to learn a new skill this year.",
      "We spent the whole afternoon walking through the old town.",
      "My friend gave me a book that I really enjoyed reading.",
      "The teacher explained the new lesson clearly and patiently."
    ],
    medium: [
      "I have decided to learn a new language this year. I think it is a good way to keep my brain active. I study for thirty minutes every evening. I use a small app on my phone. The lessons are short and fun. I already know about two hundred words. It is a slow process but I enjoy every step.",
      "Last weekend my family went to the mountains. We left early in the morning to avoid the traffic. The road was long but the view was beautiful. We stopped at a small village for lunch. The food was simple and delicious. In the afternoon we walked through a green forest. By the time we got home, we were tired but very happy."
    ],
    large: [
      "Learning a new language as an adult is challenging but deeply rewarding. The hardest part for most people is not the grammar or the vocabulary but the time it takes to see real progress. In the first few months you can feel completely lost. The words sound like noise. The sentences look like puzzles. But if you keep practicing a little every day, something amazing happens after about six months. Suddenly you start to understand short conversations. You catch words in songs. You read simple signs without thinking. This is the moment when most learners fall in love with the process and decide to keep going for years."
    ]
  },
  B1: {
    words: ["nevertheless", "accordingly", "subsequently", "considerable", "substantial", "fundamental", "comprehensive", "consequence", "perspective", "approach"],
    chunks: ["from my point of view", "on the other hand", "as a matter of fact", "as a result"],
    small: [
      "Reading widely is one of the most effective ways to expand your vocabulary.",
      "Nevertheless, the project succeeded despite the initial setbacks."
    ],
    medium: [
      "The most effective way to learn anything new is through consistent, deliberate practice. It is far better to spend twenty minutes every day on a skill than to spend three hours once a week. The brain consolidates learning during the gaps between sessions, and frequent exposure prevents the natural forgetting that happens with longer breaks."
    ],
    large: [
      "Becoming truly fluent in a foreign language is a journey that typically spans many years and benefits enormously from a structured approach. The early stages reward broad exposure to common vocabulary and basic patterns. The middle stages reward focused work on grammar and the development of a clear ear for the language as it is actually spoken. The advanced stages reward immersion, whether through travel, sustained reading, or deep relationships with native speakers. At every stage, the learners who progress most are those who treat mistakes as information rather than failures and who keep finding ways to make the practice genuinely enjoyable."
    ]
  },
  B2: {
    words: ["nuanced", "implicit", "underlying", "framework", "paradigm", "trajectory", "interplay", "convergence"],
    chunks: [],
    small: [
      "The nuanced argument required careful reading and considerable patience.",
      "Underlying assumptions often shape conclusions more than the explicit evidence does."
    ],
    medium: [
      "The relationship between language and thought is one of the most enduring puzzles in cognitive science. Some researchers argue that the language we speak shapes the categories we use to perceive the world. Others contend that thought operates largely independently of language and that translation between languages would be impossible if this were not the case."
    ],
    large: [
      "Long-term mastery in any complex domain follows recognizable patterns that have been documented across fields as varied as music, athletics, mathematics, and chess. Early progress is fast and visible. Intermediate progress requires more deliberate effort and starts to slow noticeably. Advanced progress demands an almost obsessive engagement with subtle distinctions that beginners cannot even perceive. At each stage, the role of feedback becomes more critical. The novice can learn from almost any teacher. The expert needs a coach who can spot tiny flaws in technique that look invisible to everyone else. This pattern explains why the gap between good and truly excellent practitioners is so much larger than the gap between beginner and competent."
    ]
  },
  C1: {
    words: ["epistemological", "ontological", "heuristic", "axiomatic", "isomorphic"],
    chunks: [],
    small: [
      "The epistemological assumptions underlying the methodology deserve more scrutiny than they typically receive."
    ],
    medium: [
      "The interplay between individual agency and structural constraint constitutes one of the central debates in contemporary social theory. Neither extreme captures the lived experience of most people, who navigate genuine constraints while exercising meaningful choice within them."
    ],
    large: [
      "The proliferation of digital communication has fundamentally restructured the experience of public discourse in ways that scholars are only beginning to map systematically. Traditional gatekeepers like editors, publishers, and producers have lost much of their previous authority to filter and contextualize information before it reaches mass audiences. The result is a media environment characterized by extraordinary diversity of voices and an equally extraordinary collapse of shared standards for evaluating truth claims. Whether this transformation ultimately strengthens or weakens democratic culture remains genuinely uncertain, and reasonable observers continue to disagree about how to weigh the obvious benefits against the equally obvious costs."
    ]
  },
  C2: {
    words: ["hermeneutic", "phenomenological", "dialectical", "performative"],
    chunks: [],
    small: ["The hermeneutic circle resists any clean resolution."],
    medium: [
      "Mature intellectual judgment is distinguished less by the accumulation of correct opinions than by the cultivated capacity to hold competing considerations in productive tension without prematurely collapsing them into false resolution."
    ],
    large: [
      "The contemporary intellectual climate is shaped by a tension that previous eras did not have to negotiate in quite the same form. On one hand, we have access to an unprecedented abundance of information, with the cumulative scholarly output of humanity now searchable in seconds from any networked device. On the other hand, we face an equally unprecedented difficulty in distinguishing serious work from sophisticated noise, in part because the production of plausible-sounding text has become almost frictionless. The result is that the classical virtues of intellectual discipline, including the patience to read difficult texts slowly and the willingness to revise one's own positions when the evidence demands it, have become at once more valuable and more rare. Cultivating these virtues in oneself and one's students may be among the most important pedagogical tasks of our moment."
    ]
  }
};

// Helper: get content for (reasonId, level, size) with general fallback
function getContent(reasonId, level, size) {
  const reason = ENGLISH_CONTENT[reasonId];
  if (reason && reason[level] && Array.isArray(reason[level][size]) && reason[level][size].length > 0) {
    return reason[level][size];
  }
  // Fallback to general pool for the same level/size
  const general = GENERAL_FALLBACK[level];
  if (general && Array.isArray(general[size]) && general[size].length > 0) {
    return general[size];
  }
  // Last resort: fallback to general A1 small
  return GENERAL_FALLBACK.A1.small;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CEFR_LEVELS, SIZE_OPTIONS, REASONS, ENGLISH_CONTENT, GENERAL_FALLBACK, getContent };
}
