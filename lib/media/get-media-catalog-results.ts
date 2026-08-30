import "server-only";

import type { MediaHubParams } from "@/lib/media/media-query-params";
import {
  getMediaHubAudioPage,
  getMediaHubVideoPage,
  type MediaHubAudioPage,
  type MediaHubVideoPage
} from "@/lib/media/media-hub-data";

export type MediaCatalogResults =
  | ({ tab: "audio" } & MediaHubAudioPage)
  | ({ tab: "video" } & MediaHubVideoPage);

/** Unified media catalog fetch — audio/video services stay separate internally. */
export async function getMediaCatalogResults(params: MediaHubParams): Promise<MediaCatalogResults> {
  if (params.tab === "video") {
    const page = await getMediaHubVideoPage(params);
    return { tab: "video", ...page };
  }
  const page = await getMediaHubAudioPage(params);
  return { tab: "audio", ...page };
}
