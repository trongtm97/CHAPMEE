export type AdSizePreset = {
  id: string;
  label: string;
  device: "desktop" | "mobile" | "any";
  width: number | null;
  height: number | null;
  size_mode: "responsive" | "fixed" | "fluid";
};

export const AD_SIZE_PRESETS: AdSizePreset[] = [
  { id: "leaderboard", label: "Leaderboard 728×90", device: "desktop", width: 728, height: 90, size_mode: "fixed" },
  { id: "large_leaderboard", label: "Large leaderboard 970×90", device: "desktop", width: 970, height: 90, size_mode: "fixed" },
  { id: "rectangle", label: "Rectangle 300×250", device: "any", width: 300, height: 250, size_mode: "fixed" },
  { id: "large_rectangle", label: "Large rectangle 336×280", device: "any", width: 336, height: 280, size_mode: "fixed" },
  { id: "sidebar", label: "Sidebar 300×600", device: "desktop", width: 300, height: 600, size_mode: "fixed" },
  { id: "mobile_banner", label: "Mobile banner 320×50", device: "mobile", width: 320, height: 50, size_mode: "fixed" },
  { id: "large_mobile_banner", label: "Large mobile banner 320×100", device: "mobile", width: 320, height: 100, size_mode: "fixed" },
  { id: "mobile_rectangle", label: "Mobile rectangle 300×250", device: "mobile", width: 300, height: 250, size_mode: "fixed" },
  { id: "responsive_full", label: "Responsive full width", device: "any", width: null, height: null, size_mode: "responsive" }
];
