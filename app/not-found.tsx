import { NotFoundState } from "@/components/ui";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import { logSeo404OnNotFound } from "@/lib/seo/log-not-found";

export default async function NotFound() {
  if (!isNextBuildPhase()) {
    await logSeo404OnNotFound();
  }

  return (
    <NotFoundState
      description="This story, episode, creator, or admin item is not available. It may have been removed, unpublished, or never existed."
      title="Nothing to read here"
    />
  );
}
