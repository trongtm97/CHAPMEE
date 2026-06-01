import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MessagesRouteLayout } from "@/components/messages/MessagesRouteLayout";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  robots: STUDIO_NOINDEX_ROBOTS
};

export const dynamic = "force-dynamic";

type MessagesLayoutProps = {
  children: React.ReactNode;
};

export default async function MessagesLayout({ children }: MessagesLayoutProps) {
  const { user, profile } = await getCurrentUser();

  if (!user || !profile) {
    redirect("/login?next=/messages");
  }

  return <MessagesRouteLayout>{children}</MessagesRouteLayout>;
}
