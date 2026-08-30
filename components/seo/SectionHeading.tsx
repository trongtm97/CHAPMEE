import type { HTMLAttributes, ReactNode } from "react";
import { Heading } from "@/components/seo/Heading";

type SectionHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: "h2" | "h3" | "h4";
  children: ReactNode;
};

export function SectionHeading({
  as = "h2",
  children,
  className = "",
  ...props
}: SectionHeadingProps) {
  return (
    <Heading as={as} className={className} {...props}>
      {children}
    </Heading>
  );
}
