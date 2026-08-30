import type { ReactNode } from "react";
import { UtilitiesLayout } from "@/components/utilities/UtilitiesLayout";

export default function UtilitiesRootLayout({ children }: { children: ReactNode }) {
  return <UtilitiesLayout>{children}</UtilitiesLayout>;
}
