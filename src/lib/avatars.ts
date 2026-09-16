// ═══════════════════════════════════════════════════════════════
// مكتبة الصور الرمزية الرسمية للجنة التكنولوجية (Preset Avatars)
// تشكيلة مميزة وعالية الدقة (Vector SVGs) للشباب والبنات
// ═══════════════════════════════════════════════════════════════

export interface PresetAvatar {
  id: string;
  name: string;
  gender: "BOY" | "GIRL";
  description: string;
  src: string;
  roleHint: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // ── شباب (Boys) ──
  {
    id: "avatar_boy_cyber_dev",
    name: "مبرمج سايبر وبايثون",
    gender: "BOY",
    description: "مطوّر شغوف بالأكواد والأمن السيبراني مع نظارات تقنية وسماعات محيطية.",
    src: "/images/avatars/boy_cyber_dev.svg",
    roleHint: "Cyber & Software Dev",
  },
  {
    id: "avatar_boy_ai_engineer",
    name: "مهندس ذكاء اصطناعي",
    gender: "BOY",
    description: "مبتكر نماذج ذكاء اصطناعي وخوارزميات تعلم عميق بشارة عصبية متوهجة.",
    src: "/images/avatars/boy_ai_engineer.svg",
    roleHint: "AI & Machine Learning",
  },
  {
    id: "avatar_boy_cloud_ninja",
    name: "خبير سحابي ونظم",
    gender: "BOY",
    description: "محترف هندسة البنية التحتية السحابية والحاويات وأنظمة السيرفرات.",
    src: "/images/avatars/boy_cloud_ninja.svg",
    roleHint: "Cloud & DevOps",
  },
  {
    id: "avatar_boy_tech_leader",
    name: "قائد تكنولوجي أنيق",
    gender: "BOY",
    description: "قائد فرق تقنية وريادة أعمال برؤية استراتيجية ووسام اللجنة المذهب.",
    src: "/images/avatars/boy_tech_leader.svg",
    roleHint: "Tech Leadership",
  },
  {
    id: "avatar_boy_game_creator",
    name: "مطور ألعاب وروبوتات",
    gender: "BOY",
    description: "مبتكر عوالم ألعاب تفاعلية وبرمجة روبوتات مع هيدسيت احترافي.",
    src: "/images/avatars/boy_game_creator.svg",
    roleHint: "Game Dev & Robotics",
  },
  {
    id: "avatar_boy_space_explorer",
    name: "مستكشف الفضاء والبيانات",
    gender: "BOY",
    description: "مستكشف بيانات ضخمة وعوالم سحابية مستقبلية برداء الفضاء السيبراني.",
    src: "/images/avatars/boy_space_explorer.svg",
    roleHint: "Big Data & Future Tech",
  },

  // ── بنات (Girls) ──
  {
    id: "avatar_girl_ai_coder",
    name: "مبرمجة ذكاء اصطناعي",
    gender: "GIRL",
    description: "مطورة أنظمة ذكية وواجهات رقمية مع نظارات ذكية ولمسة أرجوانية أنيقة.",
    src: "/images/avatars/girl_ai_coder.svg",
    roleHint: "AI & Full-Stack",
  },
  {
    id: "avatar_girl_ui_designer",
    name: "مصممة تجربة وواجهات UI/UX",
    gender: "GIRL",
    description: "مبدعة تجارب المستخدم والجمال الرقمي مع قلم التصميم الاحترافي.",
    src: "/images/avatars/girl_ui_designer.svg",
    roleHint: "Product & UI/UX Design",
  },
  {
    id: "avatar_girl_cyber_shield",
    name: "خبيرة أمن سيبراني",
    gender: "GIRL",
    description: "حارسة الأنظمة الرقمية والمتخصصة في صد الهجمات والاختراق الأخلاقي.",
    src: "/images/avatars/girl_cyber_shield.svg",
    roleHint: "Cyber Security & Defense",
  },
  {
    id: "avatar_girl_tech_leader",
    name: "قائدة تقنية وتنفيذية",
    gender: "GIRL",
    description: "قائدة ملهمة تدير المشروعات الرقمية برؤية ثاقبة وأناقة قيادية.",
    src: "/images/avatars/girl_tech_leader.svg",
    roleHint: "Tech Lead & PM",
  },
  {
    id: "avatar_girl_data_scientist",
    name: "عالمة بيانات وخوارزميات",
    gender: "GIRL",
    description: "محللة بيانات دقيقة تستخرج الرؤى والأنماط المعقدة بنظارات تحليلية.",
    src: "/images/avatars/girl_data_scientist.svg",
    roleHint: "Data Science & BI",
  },
  {
    id: "avatar_girl_cloud_architect",
    name: "مهندسة حلول سحابية",
    gender: "GIRL",
    description: "معمارية أنظمة متصلة وسحابية عالية التوافر بسماعات استوديو تقنية.",
    src: "/images/avatars/girl_cloud_architect.svg",
    roleHint: "Cloud Solutions Architect",
  },
];

export function getPresetAvatar(srcOrId?: string | null): PresetAvatar | null {
  if (!srcOrId) return null;
  return (
    PRESET_AVATARS.find((a) => a.src === srcOrId || a.id === srcOrId) || null
  );
}
