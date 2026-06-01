import type { ReactNode } from "react";
import { StudioPanel, StudioPanelBody } from "@/components/studio/dashboard/shared/StudioPanel";
import { StudioSectionHeader } from "@/components/studio/dashboard/shared/StudioSectionHeader";

type StudioDashboardSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  panelMinHeight?: "none" | "sm" | "md";
  subtitle?: string;
  title: string;
};

export function StudioDashboardSection({
  action,
  children,
  className = "",
  id,
  panelMinHeight = "sm",
  subtitle,
  title
}: StudioDashboardSectionProps) {
  return (
    <section className={`flex h-full flex-col ${className}`} id={id}>
      <StudioPanel minHeight={panelMinHeight}>
        <div className="border-b border-white/10 px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          <StudioSectionHeader action={action} subtitle={subtitle} title={title} />
        </div>
        <StudioPanelBody>{children}</StudioPanelBody>
      </StudioPanel>
    </section>
  );
}
