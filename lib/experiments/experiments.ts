import type { ExperimentDefinition } from "@/types/experiment";

export const experimentDefinitions: ExperimentDefinition[] = [
  {
    experiment_key: "landing_hero_copy",
    description: "Test hero headline on landing page.",
    status: "active",
    variants: [
      {
        key: "A",
        label: "Luot truyen cuon nhu TikTok",
        payload: { hero_title: "Lướt truyện cuốn như TikTok" }
      },
      {
        key: "B",
        label: "Cau chu cung co the viral",
        payload: { hero_title: "Câu chữ cũng có thể viral" }
      }
    ],
    traffic_allocation: [50, 50],
    default_variant: "A"
  },
  {
    experiment_key: "swipe_cta_copy",
    description: "Test CTA copy in swipe overlay.",
    status: "active",
    variants: [
      {
        key: "A",
        label: "Doc tiep",
        payload: { cta_label: "Đọc tiếp" }
      },
      {
        key: "B",
        label: "Xem chap tiep",
        payload: { cta_label: "Xem chap tiếp" }
      }
    ],
    traffic_allocation: [50, 50],
    default_variant: "A"
  },
  {
    experiment_key: "onboarding_first_step",
    description: "Test onboarding first step order.",
    status: "draft",
    variants: [
      {
        key: "A",
        label: "role first",
        payload: { first_step: "role" }
      },
      {
        key: "B",
        label: "genre first",
        payload: { first_step: "genre" }
      }
    ],
    traffic_allocation: [50, 50],
    default_variant: "A"
  },
  {
    experiment_key: "share_card_cta",
    description: "Test share card CTA copy.",
    status: "draft",
    variants: [
      {
        key: "A",
        label: "Doc tiep tren ChapMee",
        payload: { cta_label: "Đọc tiếp trên ChapMee" }
      },
      {
        key: "B",
        label: "Luot truyen nay tren ChapMee",
        payload: { cta_label: "Lướt truyện này trên ChapMee" }
      }
    ],
    traffic_allocation: [50, 50],
    default_variant: "A"
  }
];

const experimentMap = new Map(
  experimentDefinitions.map((item) => [item.experiment_key, item])
);

export function getExperimentDefinition(experimentKey: string) {
  return experimentMap.get(experimentKey) ?? null;
}

export function isExperimentActive(definition: ExperimentDefinition) {
  if (definition.status !== "active") {
    return false;
  }

  const now = Date.now();
  if (definition.start_date && now < new Date(definition.start_date).getTime()) {
    return false;
  }
  if (definition.end_date && now > new Date(definition.end_date).getTime()) {
    return false;
  }

  return true;
}
