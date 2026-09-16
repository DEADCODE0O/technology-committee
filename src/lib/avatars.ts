// ═══════════════════════════════════════════════════════════════
// مكتبة الصور الرمزية للطلاب (Student Avatar Characters)
// شخصيات طلابية طبيعية ومتنوعة (أنشطة ثقافية، فنية، رياضية، واجتماعية)
// ═══════════════════════════════════════════════════════════════

export interface PresetAvatar {
  id: string;
  name: string;
  gender: "BOY" | "GIRL";
  description: string;
  src: string;
  tag: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  // ── شباب (Boys) ──
  {
    id: "avatar_boy_ziad",
    name: "زياد",
    gender: "BOY",
    description: "شخصية هادئة ومحبة للقراءة والاطلاع والأنشطة الثقافية.",
    src: "/images/avatars/boy_cyber_dev.svg",
    tag: "القراءة والاطلاع",
  },
  {
    id: "avatar_boy_omar",
    name: "عمر",
    gender: "BOY",
    description: "شاب نشيط ومحب للرياضة والعمل الجماعي وروح المبادرة في كل حدث.",
    src: "/images/avatars/boy_ai_engineer.svg",
    tag: "الرياضة والنشاط",
  },
  {
    id: "avatar_boy_kareem",
    name: "كريم",
    gender: "BOY",
    description: "شاب مبدع وودود، مهتم بالفنون والتنظيم والتفاعل مع زملائه.",
    src: "/images/avatars/boy_cloud_ninja.svg",
    tag: "الفنون والتنظيم",
  },
  {
    id: "avatar_boy_yassin",
    name: "ياسين",
    gender: "BOY",
    description: "شخصية قيادية ومنظمة، يسعى للتميز وتقديم المساعدة في كل وقت.",
    src: "/images/avatars/boy_tech_leader.svg",
    tag: "القيادة والتنظيم",
  },
  {
    id: "avatar_boy_ahmed",
    name: "أحمد",
    gender: "BOY",
    description: "طالب مرح ومبتسم، يحب التجربة والمشاركة في ورش العمل والفعاليات.",
    src: "/images/avatars/boy_game_creator.svg",
    tag: "الأنشطة العامة",
  },
  {
    id: "avatar_boy_tariq",
    name: "طارق",
    gender: "BOY",
    description: "شخصية متفائلة وحيوية، شغوف بالمعرفة والاستكشاف وتطوير المهارات.",
    src: "/images/avatars/boy_space_explorer.svg",
    tag: "المعرفة والمهارات",
  },

  // ── بنات (Girls) ──
  {
    id: "avatar_girl_mariam",
    name: "مريم",
    gender: "GIRL",
    description: "طالبة مجتهدة ومتفوقة، تحب المشاركة في الأنشطة الثقافية والتطوعية.",
    src: "/images/avatars/girl_ai_coder.svg",
    tag: "الثقافة والتطوع",
  },
  {
    id: "avatar_girl_sarah",
    name: "سارة",
    gender: "GIRL",
    description: "شخصية فنية ومبدعة، تهتم بالتصميم والتعبير الإبداعي والرسم.",
    src: "/images/avatars/girl_ui_designer.svg",
    tag: "الفنون والإبداع",
  },
  {
    id: "avatar_girl_nour",
    name: "نور",
    gender: "GIRL",
    description: "طالبة حيوية ومتفائلة، تحب العمل الجماعي والأنشطة الاجتماعية والرياضية.",
    src: "/images/avatars/girl_cyber_shield.svg",
    tag: "الرياضة والأنشطة",
  },
  {
    id: "avatar_girl_farida",
    name: "فريدة",
    gender: "GIRL",
    description: "شخصية أنيقة ومنظمة، تتميز بالحضور والقيادة وحب المبادرة.",
    src: "/images/avatars/girl_tech_leader.svg",
    tag: "القيادة والمبادرة",
  },
  {
    id: "avatar_girl_salma",
    name: "سلمى",
    gender: "GIRL",
    description: "طالبة هادئة وذكية، شغوفة بالبحث والتعلم ومساعدة زميلاتها.",
    src: "/images/avatars/girl_data_scientist.svg",
    tag: "البحث والتعلم",
  },
  {
    id: "avatar_girl_laila",
    name: "ليلى",
    gender: "GIRL",
    description: "طالبة إيجابية وملهمة، تحب الأنشطة المتنوعة وصنع أثر جميل في كل مكان.",
    src: "/images/avatars/girl_cloud_architect.svg",
    tag: "المشاركة الإيجابية",
  },
];

export function getPresetAvatar(srcOrId?: string | null): PresetAvatar | null {
  if (!srcOrId) return null;
  return (
    PRESET_AVATARS.find((a) => a.src === srcOrId || a.id === srcOrId) || null
  );
}
