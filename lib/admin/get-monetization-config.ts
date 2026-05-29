import {
  buildStudioMonetizationConfigView,
  type StudioMonetizationConfigBuildOptions
} from "@/lib/studio/monetization-config";

/** Admin/creator-facing monetization flags — values come from DB settings, not hardcoded. */
export async function getMonetizationConfigForStudio(
  options?: StudioMonetizationConfigBuildOptions
) {
  return buildStudioMonetizationConfigView(options);
}
