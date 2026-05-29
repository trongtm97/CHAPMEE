import {
  CommunityLayout,
  type CommunityLayoutProps
} from "@/components/community/MobileCommunityLayout";

/** Desktop uses the same community UI as mobile. */
export function DesktopCommunityLayout(props: CommunityLayoutProps) {
  return <CommunityLayout {...props} />;
}
