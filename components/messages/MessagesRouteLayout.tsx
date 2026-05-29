"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type MessagesRouteLayoutProps = {
  children: ReactNode;
};

function isConversationPath(pathname: string) {
  return /^\/messages\/[^/?#]+/.test(pathname);
}

export function MessagesRouteLayout({ children }: MessagesRouteLayoutProps) {
  const pathname = usePathname();
  const isConversation = isConversationPath(pathname);

  if (isConversation) {
    return (
      <div className="fixed inset-x-0 top-0 z-40 flex h-[100dvh] flex-col bg-[#06090d] pt-[env(safe-area-inset-top)] lg:static lg:z-auto lg:h-auto lg:min-h-0 lg:bg-transparent lg:pt-0">
        {children}
      </div>
    );
  }

  return <section className="space-y-3 pb-2">{children}</section>;
}
