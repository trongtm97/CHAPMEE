import type { Metadata } from "next";
import { AdminNavProvider } from "@/components/admin/AdminNavProvider";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { STUDIO_NOINDEX_ROBOTS } from "@/lib/seo/should-index";

export const metadata: Metadata = {
  robots: STUDIO_NOINDEX_ROBOTS
};

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authContext = await getCurrentAuthContext();

  return (
    <AdminNavProvider flags={authContext?.flags}>{children}</AdminNavProvider>
  );
}
