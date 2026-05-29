import { redirect } from "next/navigation";
import { studioPath } from "@/lib/studio/constants";

export default function CreatorCalendarLegacyPage() {
  redirect(studioPath("/calendar"));
}
