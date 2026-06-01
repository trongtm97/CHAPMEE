import {
  composerModeToPresentationMode,
  isComposerMode,
  presentationModeToComposerMode
} from "@/lib/composer/modes";
import type { ComposerMode } from "@/lib/composer/types";
import { PRESENTATION_MODE_SLUGS } from "@/lib/taxonomy/constants";
import type { PresentationModeSlug } from "@/lib/taxonomy/constants";
import type { TaxonomyTerm } from "@/types/taxonomy";

/**
 * Central bridge between taxonomy `presentation_mode` terms and ComposerMode.
 * Do not define ad-hoc mappings elsewhere — import from this module.
 */

export function getComposerModeFromPresentationTerm(
  termOrSlug: TaxonomyTerm | string | null | undefined
): ComposerMode {
  const slug =
    typeof termOrSlug === "string"
      ? termOrSlug.trim()
      : termOrSlug?.slug?.trim() ?? "";
  return presentationModeToComposerMode(slug || null);
}

export function getPresentationTermFromComposerMode(
  mode: ComposerMode
): PresentationModeSlug {
  return composerModeToPresentationMode(mode) as PresentationModeSlug;
}

/** Whether a taxonomy presentation_mode slug maps to a Composer editor mode. */
export function isPresentationModeSupportedByComposer(
  slug: string | null | undefined
): boolean {
  const normalized = (slug ?? "").trim();
  if (!normalized) return false;
  return PRESENTATION_MODE_SLUGS.includes(normalized as PresentationModeSlug);
}

/** Composer-only modes not exposed as taxonomy presentation_mode terms. */
export function isComposerOnlyMode(mode: string): boolean {
  return isComposerMode(mode) && !isPresentationModeSupportedByComposer(mode);
}

export {
  composerModeToPresentationMode,
  presentationModeToComposerMode
} from "@/lib/composer/modes";
