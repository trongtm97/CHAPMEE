import type { Metadata } from "next";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  robots: STUDIO_NOINDEX_ROBOTS
};

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  return children;
}
