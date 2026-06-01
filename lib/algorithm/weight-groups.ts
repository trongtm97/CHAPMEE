import type { AlgorithmSettingCategory } from "@/types/algorithm-settings";

export type AlgorithmWeightGroupDef = {
  id: string;
  label: string;
  category: AlgorithmSettingCategory;
  keyPrefix: string;
  targetSum: number;
};

/** Keys matching `.weight.` and not `penalty` must sum to targetSum per surface. */
export const ALGORITHM_WEIGHT_GROUPS: AlgorithmWeightGroupDef[] = [
  {
    id: "reels_weights",
    label: "Reels — tổng trọng số",
    category: "reels",
    keyPrefix: "reels.weight.",
    targetSum: 1
  },
  {
    id: "discover_weights",
    label: "Khám phá — tổng trọng số",
    category: "discover",
    keyPrefix: "discover.weight.",
    targetSum: 1
  },
  {
    id: "ranking_weights",
    label: "Bảng xếp hạng — tổng trọng số",
    category: "ranking",
    keyPrefix: "ranking.weight.",
    targetSum: 1
  },
  {
    id: "search_weights",
    label: "Tìm kiếm — tổng trọng số",
    category: "search",
    keyPrefix: "search.weight.",
    targetSum: 1
  },
  {
    id: "fds_weights",
    label: "FDS — tổng trọng số phân phối công bằng",
    category: "fairness",
    keyPrefix: "fds.weight.",
    targetSum: 1
  }
];

export function isWeightKey(key: string) {
  return /\.weight\./.test(key) && !/penalty/i.test(key);
}
