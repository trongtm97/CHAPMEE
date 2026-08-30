import {
  SocialChannelPage,
  buildSocialChannelMetadata
} from "@/lib/social-channel-page";

export async function generateMetadata() {
  return buildSocialChannelMetadata("tiktok");
}

export default function TikTokPage() {
  return <SocialChannelPage platform="tiktok" />;
}
