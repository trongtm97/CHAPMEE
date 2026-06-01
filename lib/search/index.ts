export { searchAll } from "@/lib/search/search-all";
export { calculateTextRelevance, calculateExactMatchScore } from "@/lib/search/relevance";
export { calculateSearchScore, scoreSearchCandidate } from "@/lib/search/ranking";
export { applySearchFairness, filterResultsByType } from "@/lib/search/fairness";
export { trackSearchResults, trackSearchClick } from "@/lib/search/track-search";
export { searchStoriesForCatalog } from "@/lib/search/catalog-bridge";
