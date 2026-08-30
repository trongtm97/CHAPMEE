/** Official DMCA.com protection badge for ChapMee footer. */
export const CHAPMEE_DMCA_BADGE_ID = "43e9560d-cd34-4c58-aca4-6ba9d411b33d";

export const CHAPMEE_DMCA_BADGE = {
  id: CHAPMEE_DMCA_BADGE_ID,
  statusUrl: `https://www.dmca.com/Protection/Status.aspx?ID=${CHAPMEE_DMCA_BADGE_ID}`,
  imageUrl: `https://images.dmca.com/Badges/dmca_protected_16_120.png?ID=${CHAPMEE_DMCA_BADGE_ID}`,
  helperScript: "https://images.dmca.com/Badges/DMCABadgeHelper.min.js",
  title: "DMCA.com Protection Status",
  alt: "DMCA.com Protection Status"
} as const;
