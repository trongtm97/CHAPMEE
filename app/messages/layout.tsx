import { redirect } from "next/navigation";
import { MessagesRouteLayout } from "@/components/messages/MessagesRouteLayout";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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
