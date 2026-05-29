import type { ReactNode } from "react";

export type PageContainerVariant =
  | "default"
  | "home"
  | "reader"
  | "swipe"
  | "admin"
  | "full";

type ResponsivePageContainerProps = {
  children: ReactNode;
  variant?: PageContainerVariant;
  className?: string;
};

function variantClasses(variant: PageContainerVariant) {
  switch (variant) {
    case "home":
      return "w-full max-w-screen-2xl px-4 md:px-6 lg:px-8";
    case "reader":
      return "w-full max-w-screen-2xl px-4 md:px-6 lg:px-8";
    case "swipe":
      return "w-full max-w-[28.75rem] px-0";
    case "admin":
      return "w-full max-w-[1400px] px-4 md:px-6 lg:px-8";
    case "full":
      return "w-full px-0";
    case "default":
    default:
      return "w-full max-w-screen-2xl px-4 md:px-6 lg:px-8";
  }
}

export function ResponsivePageContainer({
  children,
  variant = "default",
  className = ""
}: ResponsivePageContainerProps) {
  return (
    <div className={`mx-auto ${variantClasses(variant)} ${className}`.trim()}>
      {children}
    </div>
  );
}
