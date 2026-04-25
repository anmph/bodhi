import rawScriptures from "@/lib/scriptures-library.json";

export interface ScriptureVerse {
  number?: string | number;
  text: string;
}

export interface ScriptureSection {
  heading: string;
  verses: ScriptureVerse[];
}

export interface ScriptureEntry {
  id: string;
  title: string;
  vietnameseTitle: string;
  tradition: string;
  origin: string;
  tagline: string;
  description: string;
  readingTimeMinutes: number;
  icon: string;
  sections: ScriptureSection[];
}

const BASE_SCRIPTURES = rawScriptures as Array<{
  id: string;
  title: string;
  tradition: string;
  origin: string;
  tagline: string;
  icon: string;
  sections: ScriptureSection[];
}>;

const CURATED_META: Record<
  string,
  { vietnameseTitle: string; readingTimeMinutes: number; description: string }
> = {
  "heart-sutra": {
    vietnameseTitle: "Bát Nhã Tâm Kinh",
    readingTimeMinutes: 9,
    description:
      "A concise Mahayana scripture on emptiness and wisdom, guiding the mind beyond grasping.",
  },
  dhammapada: {
    vietnameseTitle: "Pháp Cú Kinh (chọn lọc)",
    readingTimeMinutes: 12,
    description:
      "Selected verses on mind, ethics, and awakening from one of the most beloved early Buddhist texts.",
  },
  "metta-sutta": {
    vietnameseTitle: "Kinh Từ Bi",
    readingTimeMinutes: 6,
    description:
      "A practical teaching on boundless loving-kindness for all beings, gentle and deeply transformative.",
  },
  "diamond-sutra": {
    vietnameseTitle: "Kim Cang Kinh (trích đoạn)",
    readingTimeMinutes: 11,
    description:
      "Selected passages that challenge attachment and point to freedom through non-clinging insight.",
  },
};

const FOUR_NOBLE_TRUTHS: ScriptureEntry = {
  id: "four-noble-truths",
  title: "The Four Noble Truths",
  vietnameseTitle: "Tứ Diệu Đế",
  tradition: "Theravada",
  origin: "Dhammacakkappavattana Sutta, Pali Canon",
  tagline: "The Buddha's first teaching: diagnose suffering, reveal its cause, and point to liberation.",
  description:
    "A foundational map of the Buddhist path: suffering, its origin, its cessation, and the Noble Eightfold Path.",
  readingTimeMinutes: 8,
  icon: "☸",
  sections: [
    {
      heading: "The First Noble Truth: Dukkha",
      verses: [
        {
          number: "1",
          text: "Birth is dukkha, aging is dukkha, illness is dukkha, death is dukkha. Union with what is displeasing is dukkha, separation from what is pleasing is dukkha, not to get what one wants is dukkha.",
        },
        {
          number: "2",
          text: "In brief, the five aggregates subject to clinging are dukkha: form, feeling, perception, formations, and consciousness.",
        },
      ],
    },
    {
      heading: "The Second Noble Truth: Origin of Dukkha",
      verses: [
        {
          number: "1",
          text: "It is craving that leads to renewed becoming, accompanied by delight and lust, seeking delight here and there: craving for sensual pleasure, craving for becoming, and craving for non-becoming.",
        },
        {
          number: "2",
          text: "When the mind clings and grasps, suffering follows. When craving is seen clearly, the chain begins to loosen.",
        },
      ],
    },
    {
      heading: "The Third Noble Truth: Cessation",
      verses: [
        {
          number: "1",
          text: "It is the fading away and cessation of that very craving, its abandoning and relinquishment, freedom from it, nonattachment.",
        },
        {
          number: "2",
          text: "When craving ceases, the heart knows peace. This is nirvana: unbinding, freedom, and stillness.",
        },
      ],
    },
    {
      heading: "The Fourth Noble Truth: The Path",
      verses: [
        {
          number: "1",
          text: "The path leading to the cessation of suffering is the Noble Eightfold Path: right view, right intention, right speech, right action, right livelihood, right effort, right mindfulness, and right concentration.",
        },
        {
          number: "2",
          text: "This path is to be practiced, not merely admired. Walked patiently, it transforms understanding into liberation.",
        },
      ],
    },
  ],
};

const CURATED_ORDER = [
  "heart-sutra",
  "dhammapada",
  "metta-sutta",
  "diamond-sutra",
];

export const CURATED_SCRIPTURES: ScriptureEntry[] = [
  ...CURATED_ORDER.map((id) => {
    const scripture = BASE_SCRIPTURES.find((entry) => entry.id === id);
    if (!scripture) {
      throw new Error(`Missing scripture dataset for ${id}`);
    }
    const meta = CURATED_META[id];
    return {
      ...scripture,
      vietnameseTitle: meta.vietnameseTitle,
      readingTimeMinutes: meta.readingTimeMinutes,
      description: meta.description,
    };
  }),
  FOUR_NOBLE_TRUTHS,
];

export const SCRIPTURE_MAP = new Map(
  CURATED_SCRIPTURES.map((scripture) => [scripture.id, scripture])
);
