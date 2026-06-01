"use client";

import { useEffect, useState } from "react";
import type { ChapterImageMap } from "@/lib/images/get-chapter-images-map";
import { isAbortError, useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

export function useChapterImagesMap(imageIds: string[]) {
  const [map, setMap] = useState<ChapterImageMap>({});
  const [loading, setLoading] = useState(false);
  const requestGuard = useLatestRequestGuard();

  const key = imageIds.slice().sort().join(",");

  useEffect(() => {
    if (!key) {
      return;
    }

    const requestId = requestGuard.nextRequestId();
    const controller = new AbortController();
    const ids = key.split(",").filter(Boolean);

    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/chapter-images/resolve", {
          body: JSON.stringify({ ids }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal
        });
        const payload = (await response.json()) as { images?: ChapterImageMap };
        if (requestGuard.onlyLatest(requestId)) {
          setMap(payload.images ?? {});
        }
      } catch (error) {
        if (!isAbortError(error) && requestGuard.onlyLatest(requestId)) {
          setMap({});
        }
      } finally {
        if (requestGuard.onlyLatest(requestId)) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [key, requestGuard]);

  return { imageMap: key ? map : {}, loading: key ? loading : false };
}
