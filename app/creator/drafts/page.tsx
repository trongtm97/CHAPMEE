import { redirect } from "next/navigation";
import { studioPath } from "@/lib/studio/constants";

export default function CreatorDraftsLegacyPage() {
  redirect(studioPath("/drafts"));
}
