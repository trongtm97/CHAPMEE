import { FooterView } from "@/components/layout/footer-view";
import { getFooterConfig } from "@/lib/settings/get-footer-config";

export async function SiteFooter() {
  const { config, logoUrl } = await getFooterConfig();
  return <FooterView config={config} logoUrl={logoUrl} />;
}
