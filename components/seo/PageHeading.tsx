import type { HTMLAttributes, ReactNode } from "react";
import { Heading } from "@/components/seo/Heading";

type PageHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

export function PageHeading({ children, className = "", ...props }: PageHeadingProps) {
  return (
    <Heading as="h1" className={className} {...props}>
      {children}
    </Heading>
  );
}
