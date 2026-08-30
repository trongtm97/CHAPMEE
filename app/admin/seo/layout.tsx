import { SeoAdminShell } from "@/components/admin/seo/SeoAdminShell";

export default function AdminSeoLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="max-w-[1400px]">
      <SeoAdminShell>{children}</SeoAdminShell>
    </section>
  );
}
