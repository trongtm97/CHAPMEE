"use client";

import { MobileBackHeader } from "@/components/me/MobileBackHeader";

export function WalletPageHeader() {
  return (
    <div className="lg:hidden">
      <MobileBackHeader backLabel="Tôi" fallbackHref="/me" title="Ví Xu" variant="compact" />
    </div>
  );
}
