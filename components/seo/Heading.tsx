import type { HTMLAttributes, ReactNode } from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4";

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as: HeadingTag;
  children: ReactNode;
};

const HEADING_CLASS_BY_TAG: Record<HeadingTag, string> = {
  h1: "text-3xl font-black tracking-tight",
  h2: "text-2xl font-black tracking-tight",
  h3: "text-xl font-bold tracking-tight",
  h4: "text-lg font-bold tracking-tight"
};

export function Heading({ as: Tag, className = "", children, ...props }: HeadingProps) {
  return (
    <Tag className={`${HEADING_CLASS_BY_TAG[Tag]} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
