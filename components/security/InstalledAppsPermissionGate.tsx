import Script from "next/script";
import { INSTALLED_APPS_PERMISSION_GATE_SCRIPT } from "@/components/security/installed-apps-permission-gate-script";

export function InstalledAppsPermissionGate() {
  return (
    <Script
      dangerouslySetInnerHTML={{ __html: INSTALLED_APPS_PERMISSION_GATE_SCRIPT }}
      id="chapmee-installed-apps-permission-gate"
      strategy="beforeInteractive"
    />
  );
}
