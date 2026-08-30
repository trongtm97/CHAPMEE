import type { HTMLAttributes, ReactNode } from "react";
import { Heading } from "@/components/seo/Heading";

type VisuallyHiddenHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h1" | "h2" | "h3" | "h4";
  children: ReactNode;
};

export function VisuallyHiddenHeading({
  as = "h1",
  children,
  className = "",
  ...props
}: VisuallyHiddenHeadingProps) {
  return (
    <Heading as={as} className={`sr-only ${className}`.trim()} {...props}>
      {children}
    </Heading>
  );
}
