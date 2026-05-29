import { Suspense } from "react";
import { LazySwipeFeed } from "@/components/swipe/LazySwipeFeed";
import { SwipeShell } from "@/components/swipe/SwipeShell";
import { ErrorState, LoadingState } from "@/components/ui";
import { getProductConfigFast } from "@/lib/config/product-config";
import { getSwipeItems } from "@/lib/swipe/getSwipeItems";

export const dynamic = "force-dynamic";

async function SwipeContent() {
  const productConfig = await getProductConfigFast();
  const { error, hasMore, items, nextOffset } = await getSwipeItems({
    limit: 12,
    offset: 0
  });

  return (
    <SwipeShell>
      {error ? (
        <ErrorState message={error} title="Không tải được feed lướt" />
      ) : null}
      <LazySwipeFeed
        desktopConfig={productConfig.swipe}
        initialHasMore={hasMore}
        initialItems={items}
        initialNextOffset={nextOffset}
      />
    </SwipeShell>
  );
}

export default function SwipePage() {
  return (
    <Suspense fallback={<LoadingState label="Đang tải feed lướt..." />}>
      <SwipeContent />
    </Suspense>
  );
}
