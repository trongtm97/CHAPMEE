import { NotFoundState } from "@/components/ui";

export default function NotFound() {
  return (
    <NotFoundState
      description="This story, episode, creator, or admin item is not available. It may have been removed, unpublished, or never existed."
      title="Nothing to read here"
    />
  );
}
