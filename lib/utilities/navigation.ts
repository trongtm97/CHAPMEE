import { UTILITIES_BASE_PATH } from "@/lib/utilities/constants";
import { getUtilityItemsByGroup, UTILITY_GROUPS, UTILITY_ITEMS } from "@/lib/utilities/utilities-hub";

export type UtilityNavItem = {
  id: string;
  href: string;
  label: string;
  description: string;
  icon: string;
  match?: "exact" | "prefix";
};

export type UtilityNavGroup = {
  id: string;
  label: string;
  items: UtilityNavItem[];
};

export const UTILITIES_HUB_NAV: UtilityNavItem = {
  id: "hub",
  href: UTILITIES_BASE_PATH,
  label: "Tổng quan",
  description: "Danh sách tiện ích",
  icon: "utility-star",
  match: "exact"
};

export const UTILITIES_TOOL_NAV: UtilityNavItem[] = UTILITY_ITEMS.map((item) => ({
  id: item.id,
  href: item.href,
  label: item.navLabel,
  description: item.description,
  icon: item.icon,
  match: "prefix"
}));

const toolNavById = new Map(UTILITIES_TOOL_NAV.map((item) => [item.id, item]));

export function getUtilitiesNavGroups(): UtilityNavGroup[] {
  return UTILITY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.itemIds
      .map((id) => toolNavById.get(id))
      .filter((item): item is UtilityNavItem => item !== undefined)
  }));
}

export function getUtilitiesNavItems(): UtilityNavItem[] {
  return [UTILITIES_HUB_NAV, ...UTILITIES_TOOL_NAV];
}

export function isUtilityNavActive(pathname: string, item: UtilityNavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
