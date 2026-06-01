import { permanentRedirect } from "next/navigation";

/** Legacy author directory — rankings is the public author discovery page. */
export default function LegacyTacGiaIndexPage() {
  permanentRedirect("/bang-xep-hang");
}
