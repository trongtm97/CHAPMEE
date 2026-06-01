import { StudioHelpCenter } from "@/components/studio/help/StudioHelpCenter";
import type { StudioHelpPageData } from "@/lib/studio/get-studio-help-page-data";

type StudioHelpPageProps = StudioHelpPageData & {
  userEmail?: string | null;
};

export function StudioHelpPage(props: StudioHelpPageProps) {
  return <StudioHelpCenter {...props} />;
}
