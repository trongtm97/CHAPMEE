"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MilestoneToast } from "@/components/milestones/MilestoneToast";
import { EarlyFanToast } from "@/components/layout/EarlyFanToast";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { ResponsivePageContainer, type PageContainerVariant } from "@/components/layout/ResponsivePageContainer";
import { AdSenseProvider } from "@/components/ads/AdSenseContext";
import { AdSenseScriptLoader } from "@/components/ads/AdSenseScriptLoader";
import { MessageUnreadProvider } from "@/components/messages/message-unread-context";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

function isEpisodeReaderRoute(pathname: string) {
  return /^\/stories\/[^/]+\/episodes\/\d+/.test(pathname);
}

function shouldHideMobileTopBar(pathname: string) {
  if (isEpisodeReaderRoute(pathname)) {
    return true;
  }
  if (pathname === "/me/settings" || pathname.startsWith("/me/settings/")) {
    return true;
  }
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) {
    return true;
  }
  if (pathname === "/notifications" || pathname.startsWith("/notifications/")) {
    return true;
  }
  if (pathname === "/messages" || pathname.startsWith("/messages/")) {
    return true;
  }
  if (pathname === "/missions" || pathname.startsWith("/missions/")) {
    return true;
  }
  return false;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const adShell = (content: React.ReactNode) => (
    <AdSenseProvider>
      <AdSenseScriptLoader />
      {content}
    </AdSenseProvider>
  );
  const isStudioRoute = pathname.startsWith("/studio");
  const isReelsRoute = pathname === "/" || pathname.startsWith("/reels");
  const isAdminRoute = pathname.startsWith("/admin");
  const isReaderRoute = pathname.startsWith("/stories/") || pathname.startsWith("/chapter/");
  const isDiscoverRoute = pathname.startsWith("/discover");
  const isCatalogRoute = pathname === "/truyen";
  const isMeRoute = pathname === "/me" || pathname.startsWith("/me/");
  const isMeSettingsRoute = pathname === "/me/settings";
  const isNotificationsRoute = pathname.startsWith("/notifications");
  const isMessageConversationRoute = /^\/messages\/[^/?#]+/.test(pathname);
  const isEpisodeReader = isEpisodeReaderRoute(pathname);
  const hideMobileBottomNav =
    isMeSettingsRoute ||
    isNotificationsRoute ||
    isMessageConversationRoute ||
    isEpisodeReader;
  const hideMobileTopBar = shouldHideMobileTopBar(pathname);
  const mobileTopBarVariant =
    isDiscoverRoute || isCatalogRoute || isMeRoute ? "compact" : "default";
  const isFeedRoute =
    pathname.startsWith("/discover") || pathname.startsWith("/community") || isCatalogRoute;

  const containerVariant: PageContainerVariant = isReelsRoute
    ? "reels"
    : isAdminRoute
      ? "admin"
      : isReaderRoute
        ? "reader"
        : isFeedRoute
          ? "feed"
          : "default";

  if (isStudioRoute) {
    return adShell(<div className="min-h-screen text-zinc-50">{children}</div>);
  }

  if (isReelsRoute) {
    return adShell(
      <MessageUnreadProvider>
      <div className="h-[100dvh] overflow-hidden bg-[#06090d] text-zinc-50">
        <DesktopHeader />
        <div className="mx-auto flex h-full w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)] lg:max-w-screen-2xl lg:flex-row lg:gap-6 lg:px-6 xl:px-8">
          <DesktopSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {hideMobileTopBar ? null : <MobileTopBar />}
            <main className="relative z-0 flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-0 md:pb-8 lg:pb-0">
              <div className="h-full w-full overflow-hidden">
                <ResponsivePageContainer className="h-full" variant="full">
                  {children}
                </ResponsivePageContainer>
              </div>
            </main>
            <MobileBottomNav />
          </div>
        </div>
      </div>
      </MessageUnreadProvider>
    );
  }

  return adShell(
    <MessageUnreadProvider>
    <div className="min-h-screen text-zinc-50">
      <DesktopHeader />
      <div className="mx-auto flex w-full max-w-screen-2xl gap-6 lg:px-6 xl:px-8">
        <DesktopSidebar adminMode={isAdminRoute} />
        <div className="min-w-0 flex-1">
          {hideMobileTopBar ? null : <MobileTopBar variant={mobileTopBarVariant} />}
          <main
            className={`flex-1 md:pb-8 ${
              isEpisodeReader
                ? "px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 md:pt-4"
                : hideMobileBottomNav
                  ? "pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-6"
                  : "pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 md:pt-6"
            } ${isMeRoute && !hideMobileBottomNav && !isEpisodeReader ? "pt-3" : ""}`}
          >
            <ResponsivePageContainer
              className={isEpisodeReader ? "!px-0 max-w-none" : ""}
              variant={containerVariant}
            >
              {children}
            </ResponsivePageContainer>
          </main>
          {hideMobileBottomNav ? null : <MobileBottomNav />}
          <Suspense fallback={null}>
            <MilestoneToast />
          </Suspense>
          <Suspense fallback={null}>
            <EarlyFanToast />
          </Suspense>
        </div>
      </div>
    </div>
    </MessageUnreadProvider>
  );
}
