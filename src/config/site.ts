// ═══════════════════════════════════════════════════════════════
//  ملف الإعدادات المركزي للموقع — النهاية والبداية
//  كل النصوص والروابط والصور والفيديو تُعدَّل من هذا الملف فقط
// ═══════════════════════════════════════════════════════════════

export const siteConfig = {
  // ── الهوية ──────────────────────────────────────────────
  nameFirstPart: "النهاية",
  nameSecondPart: "والبداية",
  nameEn: "THE END & THE BEGINNING",
  logo: "/images/logo.png",

  // ── التسجيل في المنصة (الزر الرئيسي في كل الموقع) ──────
  joinUrl: "/register",
  joinLabel: "سجّل في المنصة الآن",

  // ── خلفية الـ Hero ──────────────────────────────────────
  hero: {
    background: "/images/logo.png",
  },

  // ── وسائل التواصل ───────────────────────────────────────
  socials: {
    whatsapp: {
      label: "WhatsApp",
      actionLabel: "تواصل عبر WhatsApp",
      value: "01115322803",
      url: "https://wa.me/201115322803",
    },
    telegram: {
      label: "Telegram",
      actionLabel: "",
      value: "",
      url: "",
    },
    facebook: {
      label: "Facebook",
      actionLabel: "",
      value: "",
      url: "",
    },
  },

  // ── الفيديو التعريفي ────────────────────────────────────
  video: {
    url: "",
    title: "اكتشف التجربة",
    description: "منصة النهاية والبداية للتعلم والتطوير والمشاريع.",
    poster: "",
    soonLabel: "قريبًا",
    duration: "00:00",
  },

  // ── قسم عن المنصة ───────────────────────────────────────
  about: {
    label: "عن المنصة",
    title: "مجتمع يصنع الفرق",
    description:
      "منصة النهاية والبداية مساحة مستقلة تجمع بين التعلم والإبداع والورش العملية، لنكتشف معًا مهارات جديدة ونصنع تجارب حقيقية.",
    image: "/images/logo.png",
    imageCaption: "منصة النهاية والبداية",
  },

  // ── المعرض (مُعطّل بناءً على طلب الخصوصية) ──────────────
  gallery: [] as { src: string; caption: string; span: string }[],
};

// ── روابط القائمة ─────────────────────────────────────────
export const navLinks = [
  { label: "تسجيل الدخول", href: "/login" },
  { label: "الأنشطة", href: "/activities" },
  { label: "المتصدرون", href: "/leaderboard" },
  { label: "المواهب", href: "/talents" },
];

// ── قسم ماذا نقدم؟ ────────────────────────────────────────
export type Offering = {
  icon: string;
  title: string;
  description: string;
  isOther?: boolean;
};

export const experienceSection = {
  label: "ماذا نقدم؟",
  titleBefore: "مساحة",
  titleGold: "إبداعية متكاملة",
  description:
    "نقدّم مجالات وتجارب متنوعة تجمع بين التعلم التطبيقي والإبداع والعمل الجماعي.",
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
  textBefore: "سجّل في منصة النهاية والبداية وأنشئ حسابك — احجز مقعدك في الورش،",
  textHighlight: "واجمع النقاط والشارات",
  textAfter: "واحتفظ بمواهبك في ملفك الخاص — التسجيل مجاني تمامًا.",
};
