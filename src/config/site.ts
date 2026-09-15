// ═══════════════════════════════════════════════════════════════
//  ملف الإعدادات المركزي للموقع — اللجنة التكنولوجية
//  كل النصوص والروابط والصور والفيديو تُعدَّل من هذا الملف فقط
// ═══════════════════════════════════════════════════════════════

export const siteConfig = {
  // ── الهوية ──────────────────────────────────────────────
  nameFirstPart: "اللجنة",
  nameSecondPart: "التكنولوجية",
  nameEn: "TECHNOLOGY COMMITTEE",
  logo: "/images/logo.png",

  // ── التسجيل في المنصة (الزر الرئيسي في كل الموقع) ──────
  joinUrl: "/register",
  joinLabel: "سجّل في المنصة الآن",

  // ── خلفية الـ Hero السينمائية ───────────────────────────
  //  صورة حقيقية من أنشطة اللجنة، مموهة مسبقًا بأسلوب Bokeh سينمائي
  //  وتُعرض خلف الشعار مع تعتيم داكن أنيق
  //  (لتغييرها ضع مسار أي صورة من public/images)
  hero: {
    background: "/images/hero-bg.webp",
  },

  // ── وسائل التواصل ───────────────────────────────────────
  socials: {
    whatsapp: {
      label: "WhatsApp",
      actionLabel: "تواصل عبر WhatsApp",
      value: "01552370838",
      url: "https://wa.me/201552370838",
    },
    telegram: {
      label: "Telegram",
      actionLabel: "تواصل عبر Telegram",
      value: "@A_H_M_000",
      url: "https://t.me/A_H_M_000",
    },
    facebook: {
      label: "Facebook",
      actionLabel: "تابعنا على Facebook",
      value: "صفحتنا الرسمية",
      url: "https://www.facebook.com/profile.php?id=61593963053878",
    },
  },

  // ── الفيديو التعريفي ────────────────────────────────────
  //  الفيديو الحالي: نسخة H.264 محسّنة (720p — تعمل على كل المتصفحات والهواتف)
  //  ── لاستبداله مستقبلًا: ضع الرابط الجديد في "url" فقط، دون أي تعديل آخر ──
  //    • رابط يوتيوب:  "https://www.youtube.com/watch?v=XXXXXXXXXXX"
  //    • أو ملف فيديو:  "/videos/intro.mp4"
  video: {
    url: "/videos/intro.mp4",
    title: "اكتشف التجربة",
    description: "شاهد جانبًا من تجربة اللجنة التكنولوجية.",
    poster: "/images/video-poster.webp",
    soonLabel: "الفيديو قريبًا",
    duration: "00:48",
  },

  // ── قسم عن اللجنة ───────────────────────────────────────
  about: {
    label: "عن اللجنة",
    title: "مجتمع يصنع الفرق",
    description:
      "اللجنة التكنولوجية مجتمع طلابي يجمع بين التعلم والإبداع والأنشطة والتجارب المختلفة، لنساعد الطلاب على اكتشاف قدراتهم وصناعة تجربة جامعية مليئة بالذكريات.",
    image: "/images/audience-outdoor.webp",
    imageCaption: "من إحدى فعاليات اللجنة",
  },

  // ── المعرض (الصور الحقيقية للأنشطة) ─────────────────────
  //  span يتحكم في حجم البلاطة داخل شبكة Bento:
  //  "big" = كبيرة مميزة | "wide" = عريضة | "tall" = طويلة | "normal" = عادية
  gallery: [
    {
      src: "/images/workshop-library.webp",
      caption: "ورشة تعليمية داخل المكتبة",
      span: "big",
    },
    {
      src: "/images/volcano-project.webp",
      caption: "مشروع البركان العلمي",
      span: "wide",
    },
    {
      src: "/images/workshop-craft-open.webp",
      caption: "ورشة أعمال يدوية",
      span: "normal",
    },
    {
      src: "/images/gathering-outdoor.webp",
      caption: "من تجمعاتنا وفعالياتنا الخارجية",
      span: "wide",
    },
    {
      src: "/images/workshop-craft-indoor.webp",
      caption: "لحظات من ورشنا التفاعلية",
      span: "tall",
    },
    {
      src: "/images/audience-outdoor.webp",
      caption: "جمهور إحدى فعالياتنا",
      span: "wide",
    },
    {
      src: "/images/workshop-outdoor.webp",
      caption: "ورشة تعليمية في الهواء الطلق",
      span: "normal",
    },
    {
      src: "/images/workshop-art-indoor.webp",
      caption: "ورشة فنية إبداعية",
      span: "normal",
    },
    {
      src: "/images/workshop-craft-outdoor.webp",
      caption: "ورشة حرفية خارجية",
      span: "normal",
    },
  ],
};

// ── روابط القائمة ─────────────────────────────────────────
export const navLinks = [
  { label: "الرئيسية", href: "/#home" },
  { label: "عن اللجنة", href: "/#about" },
  { label: "الأنشطة", href: "/activities" },
  { label: "المتصدرون", href: "/leaderboard" },
  { label: "المواهب", href: "/talents" },
  { label: "تواصل معنا", href: "/#contact" },
];

// ── قسم ماذا نقدم؟ ────────────────────────────────────────
//  مجالات وتجارب متنوعة — ليست مرتبطة بعدد ثابت من البرامج
export type Offering = {
  icon: string;
  title: string;
  description: string;
  isOther?: boolean;
};

export const experienceSection = {
  label: "ماذا نقدم؟",
  titleBefore: "أكثر من مجرد",
  titleGold: "لجنة",
  description:
    "كل ترم بنقدّم مجالات وتجارب متنوعة تجمع بين التعلم والإبداع والترفيه والتجارب الجديدة.",
};

export const offerings: Offering[] = [
  {
    icon: "laptop",
    title: "كورسات ومهارات",
    description: "تعلّم وطوّر مهاراتك.",
  },
  {
    icon: "shapes",
    title: "ورش وأنشطة",
    description: "جرّب، شارك، واكتشف اهتمامات جديدة.",
  },
  {
    icon: "palette",
    title: "الفنون والإبداع",
    description: "أطلق خيالك وعبّر بإبداعك.",
  },
  {
    icon: "scissors",
    title: "الأشغال اليدوية",
    description: "اصنع بيديك أشياء مميزة.",
  },
  {
    icon: "star",
    title: "المواهب والمهارات",
    description: "اكتشف مواهبك وأبرزها.",
  },
  {
    icon: "mic",
    title: "ندوات ولقاءات",
    description: "استمع، ناقش، وتعرّف على تجارب وأفكار مختلفة.",
  },
  {
    icon: "bus",
    title: "رحلات وزيارات",
    description: "اخرج من الروتين واكتشف تجارب وأماكن جديدة.",
  },
  {
    icon: "party",
    title: "حفلات وفعاليات",
    description: "استمتع واصنع ذكريات مختلفة.",
  },
  {
    icon: "trophy",
    title: "مسابقات وتحديات",
    description: "تحدَّ نفسك وشارك في تجارب تنافسية.",
  },
  {
    icon: "sparkles",
    title: "برامج أخرى",
    description: "المزيد من البرامج والتجارب المميزة بانتظارك.",
    isOther: true,
  },
];

// ── قسم التسجيل في المنصة ─────────────────────────────────────────
export const joinSection = {
  titleBefore: "حسابك في",
  titleGold: "دقيقة واحدة",
  textBefore: "سجّل في منصة اللجنة وأنشئ حسابك — احجز مقعدك في الورش،",
  textHighlight: "واجمع النقاط والشارات",
  textAfter: "واحتفظ بمواهبك في ملفك الخاص — التسجيل مجاني تمامًا للطلاب.",
};
