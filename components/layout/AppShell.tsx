"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AuthEntryBackground } from "@/components/auth/auth-entry-background";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { DesktopHeader } from "@/components/layout/DesktopHeader";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { EarlyFanToast } from "@/components/layout/EarlyFanToast";
import { MeCompactFooter } from "@/components/layout/MeCompactFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import {
  ResponsivePageContainer,
  type PageContainerVariant
} from "@/components/layout/ResponsivePageContainer";
import { MilestoneToast } from "@/components/milestones/MilestoneToast";
import { MessageUnreadProvider } from "@/components/messages/message-unread-context";
import { AdSenseProvider } from "@/components/ads/AdSenseContext";
import { AdSenseScriptLoader } from "@/components/ads/AdSenseScriptLoader";
import { isAtProfilePath } from "@/lib/profile/profile-url";
import { GlobalAudioProvider } from "@/src/components/audio/GlobalAudioProvider";

type AppShellProps = Readonly<{
  children: React.ReactNode;
  footer?: React.ReactNode;
}>;

function shouldHideSiteFooter(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/reels")) return true;
  if (pathname.startsWith("/studio")) return true;
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/tien-ich")) return true;
  if (pathname.startsWith("/bai-viet")) return true;
  if (/^\/stories\/[^/]+\/episodes\/\d+/.test(pathname)) return true;
  if (/^\/truyen\/[^/]+\/chuong\/[^/]+/.test(pathname)) return true;
  if (/^\/messages\/[^/?#]+/.test(pathname)) return true;
  return false;
}

function isEpisodeReaderRoute(pathname: string) {
  return (
    /^\/stories\/[^/]+\/episodes\/\d+/.test(pathname) ||
    /^\/truyen\/[^/]+\/chuong\/[^/]+/.test(pathname)
  );
}

function shouldHideMobileTopBar(pathname: string) {
  if (isEpisodeReaderRoute(pathname)) return true;
  if (pathname === "/me/settings" || pathname.startsWith("/me/settings/"))
    return true;
  if (pathname === "/wallet" || pathname.startsWith("/wallet/")) return true;
  if (pathname === "/notifications" || pathname.startsWith("/notifications/"))
    return true;
  if (pathname === "/messages" || pathname.startsWith("/messages/"))
    return true;
  if (pathname === "/missions" || pathname.startsWith("/missions/"))
    return true;
  return false;
}

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  );
}

export function AppShell({ children, footer }: AppShellProps) {
  const pathname = usePathname();
  const hideSiteFooter = shouldHideSiteFooter(pathname);
  const authRoute = isAuthRoute(pathname);

  const adShell = (content: React.ReactNode) => (
    <AdSenseProvider>
      <AdSenseScriptLoader />
      {content}
    </AdSenseProvider>
  );

  const isStudioRoute = pathname.startsWith("/studio");
  const isUtilitiesRoute = pathname.startsWith("/tien-ich");
  const isContentPostsRoute = pathname.startsWith("/bai-viet");
  const isReelsRoute = pathname === "/" || pathname.startsWith("/reels");
  const isAdminRoute = pathname.startsWith("/admin");
  const isReaderRoute =
    pathname.startsWith("/stories/") || pathname.startsWith("/chapter/");
  const isCatalogRoute =
    pathname === "/truyen" ||
    pathname.startsWith("/truyen-sang-tac") ||
    pathname.startsWith("/truyen-dich");
  const isMeRoute = pathname === "/me" || pathname.startsWith("/me/");
  const isMeHubRoute = pathname === "/me";
  const isPublicProfileRoute = isAtProfilePath(pathname);
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
  const isFeedRoute =
    pathname.startsWith("/discover") ||
    pathname.startsWith("/media") ||
    pathname.startsWith("/community") ||
    isCatalogRoute;

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
    return adShell(
      <GlobalAudioProvider>
        <div className="min-h-screen text-zinc-50">{children}</div>
      </GlobalAudioProvider>
    );
  }

  if (authRoute) {
    const isAuthEntryRoute =
      pathname === "/login" || pathname === "/register";

    return (
      <GlobalAudioProvider>
        <div className="relative flex min-h-[100dvh] flex-col text-zinc-50">
          <AuthEntryBackground />
          <AuthHeader compact={isAuthEntryRoute} pathname={pathname} />
          <main
            className={
              isAuthEntryRoute
                ? "relative mx-auto w-full max-w-7xl flex-1 px-0 py-3 sm:py-4 lg:py-5"
                : "relative mx-auto w-full max-w-7xl flex-1 px-0 py-4 md:py-6"
            }
          >
            {children}
          </main>
          <AuthFooter compact={isAuthEntryRoute} />
        </div>
      </GlobalAudioProvider>
    );
  }

  if (isReelsRoute) {
    return adShell(
      <GlobalAudioProvider>
        <MessageUnreadProvider>
          <div className="h-[100dvh] overflow-hidden bg-[#06090d] text-zinc-50">
            <Suspense fallback={<div className="hidden h-12 lg:block" />}>
              <DesktopHeader />
            </Suspense>
            <div className="mx-auto flex h-full w-full flex-col overflow-hidden lg:h-[calc(100dvh-4rem)] lg:max-w-screen-2xl lg:flex-row lg:gap-6 lg:px-6 xl:px-8">
              <Suspense fallback={null}>
                <DesktopSidebar />
              </Suspense>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                {hideMobileTopBar ? null : <MobileTopBar />}
                <main className="relative z-0 flex-1 overflow-hidden pb-[calc(3.65rem+env(safe-area-inset-bottom))] pt-0 md:pb-8 lg:pb-0">
                  <div className="h-full w-full overflow-hidden">
                    <ResponsivePageContainer className="h-full" variant="full">
                      {children}
                    </ResponsivePageContainer>
                  </div>
                </main>
                <Suspense fallback={null}>
                  <MobileBottomNav />
                </Suspense>
              </div>
            </div>
          </div>
        </MessageUnreadProvider>
      </GlobalAudioProvider>
    );
  }

  return adShell(
    <GlobalAudioProvider>
      <MessageUnreadProvider>
        <div className="min-h-screen text-zinc-50">
          <Suspense fallback={<div className="hidden h-12 lg:block" />}>
            <DesktopHeader compact={isEpisodeReader} />
          </Suspense>
          <div className="mx-auto flex w-full max-w-screen-2xl gap-6 lg:px-6 xl:px-8">
            {isEpisodeReader || isUtilitiesRoute || isContentPostsRoute ? null : (
              <Suspense fallback={null}>
                <DesktopSidebar adminMode={isAdminRoute} />
              </Suspense>
            )}
            <div className="min-w-0 flex-1">
              {hideMobileTopBar ? null : <MobileTopBar />}
              <main
                className={`flex-1 md:pb-8 ${
                  isEpisodeReader
                    ? "px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 md:pt-4"
                    : hideMobileBottomNav
                      ? "pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-6"
                      : "pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-5 md:pt-6"
                } ${isMeRoute && !hideMobileBottomNav && !isEpisodeReader ? "pt-2" : ""}`}
              >
                <ResponsivePageContainer
                  className={
                    isEpisodeReader
                      ? "!px-0 max-w-none"
                      : isUtilitiesRoute || isContentPostsRoute
                        ? "!px-2 max-w-none sm:!px-3 md:!px-4"
                        : ""
                  }
                  variant={isUtilitiesRoute || isContentPostsRoute ? "full" : containerVariant}
                >
                  {children}
                </ResponsivePageContainer>
              </main>
              {!hideSiteFooter && footer ? (
                isMeHubRoute ? (
                  <>
                    <div className="mt-2 hidden lg:block">{footer}</div>
                    <MeCompactFooter />
                  </>
                ) : (
                  <div
                    className={`mt-2 ${isPublicProfileRoute ? "[&_footer]:py-4 [&_footer_.lg\\:grid]:hidden" : ""}`}
                  >
                    {footer}
                  </div>
                )
              ) : null}
              {hideMobileBottomNav ? null : (
                <Suspense fallback={null}>
                  <MobileBottomNav />
                </Suspense>
              )}
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
    </GlobalAudioProvider>
  );
}
