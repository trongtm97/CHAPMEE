import {
  SocialChannelPage,
  buildSocialChannelMetadata
} from "@/lib/social-channel-page";

export async function generateMetadata() {
  return buildSocialChannelMetadata("youtube");
}

export default function YouTubePage() {
  return <SocialChannelPage platform="youtube" />;
}
