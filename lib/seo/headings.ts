/** Heading conventions for ChapMee public and private pages. */

export const SEO_HEADING_GUIDELINES = {
  singleH1PerPage: true,
  publicListing: {
    h1: "Page title",
    h2: "Section titles",
    h3: "Card titles when needed"
  },
  studioAdmin: {
    h1: "Page title (accessibility)",
    noindex: true,
    avoidH1On: ["logo", "menu", "button", "card"]
  },
  avoidH1On: ["logo", "menu", "button", "card"] as const
} as const;
