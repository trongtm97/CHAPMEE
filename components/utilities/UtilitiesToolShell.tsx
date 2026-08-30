import type { ReactNode } from "react";

type UtilitiesToolShellProps = Readonly<{
  children: ReactNode;
}>;

/** Fixed-height workspace for interactive utility tools. */
export function UtilitiesToolShell({ children }: UtilitiesToolShellProps) {
  return <div className="flex min-h-0 flex-col">{children}</div>;
}
