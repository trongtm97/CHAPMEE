import type { ReactNode } from "react";
import { Badge } from "@/components/ui";

type StudioBadgeVariant = "default" | "success" | "warning" | "danger" | "cyan";

type StudioBadgeProps = {
  children: ReactNode;
  variant?: StudioBadgeVariant;
  /** Nhãn dashboard — chữ thường, không uppercase. */
  soft?: boolean;
};

const variantMap: Record<
  StudioBadgeVariant,
  "default" | "success" | "warning" | "danger"
> = {
  cyan: "default",
  danger: "danger",
  default: "default",
  success: "success",
  warning: "warning"
};

export function StudioBadge({
  children,
  soft = false,
  variant = "default"
}: StudioBadgeProps) {
  const softClass = soft
    ? "normal-case tracking-normal text-xs font-medium px-2 py-0.5"
    : "";

  return (
    <Badge
      className={`${variant === "cyan" ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-200" : ""} ${softClass}`}
      variant={variantMap[variant]}
    >
      {children}
    </Badge>
  );
}
