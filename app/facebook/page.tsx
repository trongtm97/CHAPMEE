import {
  SocialChannelPage,
  buildSocialChannelMetadata
} from "@/lib/social-channel-page";

export async function generateMetadata() {
  return buildSocialChannelMetadata("facebook");
}

export default function FacebookPage() {
  return <SocialChannelPage platform="facebook" />;
}
