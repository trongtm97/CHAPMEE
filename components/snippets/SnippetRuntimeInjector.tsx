"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  injectSnippetHeadElements,
  injectSnippetMarkup,
  removeInjectedSnippetNodes
} from "@/lib/snippets/inject-snippet-markup";
import { looksLikeSnippetHtml, parseSnippetMarkup } from "@/lib/snippets/parse-snippet-markup";
import { sanitizeSnippetHtml } from "@/lib/snippets/sanitize-html";
import {
  isDefaultExcludedRoute,
  matchesDevice,
  snippetAllowedOnRoute
} from "@/lib/snippets/route-match";
import { matchesUserTarget } from "@/lib/snippets/user-match";
import type { RuntimeSnippetPayload, SnippetUserRuntimeContext } from "@/lib/snippets/types";

type SnippetRuntimeInjectorProps = {
  snippets: RuntimeSnippetPayload[];
  userContext: SnippetUserRuntimeContext;
  disabled?: boolean;
};

function useViewportClass(): "mobile" | "desktop" | "unknown" {
  const [viewport, setViewport] = useState<"mobile" | "desktop" | "unknown">("unknown");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setViewport(mq.matches ? "mobile" : "desktop");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return viewport;
}

function getSafeHtmlBody(code: string): string {
  const bodyHtml = looksLikeSnippetHtml(code)
    ? parseSnippetMarkup(code).bodyHtml
    : code;
  return sanitizeSnippetHtml(bodyHtml);
}

function filterSnippets(
  snippets: RuntimeSnippetPayload[],
  pathname: string,
  user: SnippetUserRuntimeContext,
  viewport: "mobile" | "desktop" | "unknown"
) {
  const now = Date.now();
  return snippets
    .filter((snippet) => {
      if (isDefaultExcludedRoute(pathname)) return false;
      if (snippet.startsAt && Date.parse(snippet.startsAt) > now) return false;
      if (snippet.endsAt && Date.parse(snippet.endsAt) < now) return false;
      if (!matchesDevice(snippet.deviceTarget, viewport)) return false;
      if (!matchesUserTarget(user, snippet.userTarget)) return false;
      return snippetAllowedOnRoute({
        pathname,
        placementConfig: snippet.placementConfig,
        routePatterns: snippet.routePatterns,
        surfaceKeys: snippet.surfaceKeys,
        type: snippet.type
      });
    })
    .sort((a, b) => a.priority - b.priority);
}

export function SnippetRuntimeInjector({
  snippets,
  userContext,
  disabled = false
}: SnippetRuntimeInjectorProps) {
  const pathname = usePathname() ?? "/";
  const viewport = useViewportClass();

  const active = useMemo(() => {
    if (disabled) return [];
    return filterSnippets(snippets, pathname, userContext, viewport);
  }, [disabled, snippets, pathname, userContext, viewport]);

  const cssBlocks = active.filter((s) => s.type === "custom_css");
  const headScripts = active.filter((s) => s.type === "head_script");
  const bodyScripts = active.filter((s) => s.type === "body_start_script");
  const footerScripts = active.filter((s) => s.type === "footer_script");
  const htmlBlocks = active.filter((s) => s.type === "safe_html");

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const snippet of headScripts) {
      cleanups.push(injectSnippetMarkup(snippet.code, snippet.id, "head"));
    }
    for (const snippet of bodyScripts) {
      cleanups.push(injectSnippetMarkup(snippet.code, snippet.id, "body"));
    }
    for (const snippet of footerScripts) {
      cleanups.push(injectSnippetMarkup(snippet.code, snippet.id, "body"));
    }
    for (const snippet of htmlBlocks) {
      cleanups.push(injectSnippetHeadElements(snippet.code, snippet.id));
    }
    return () => {
      for (const fn of cleanups) fn();
      removeInjectedSnippetNodes();
    };
  }, [headScripts, bodyScripts, footerScripts, htmlBlocks]);

  if (disabled || active.length === 0) {
    return null;
  }

  return (
    <>
      {cssBlocks.map((snippet) => (
        <style
          dangerouslySetInnerHTML={{ __html: snippet.code }}
          data-chapmee-snippet={snippet.id}
          key={`css-${snippet.id}`}
        />
      ))}
      {htmlBlocks.map((snippet) => {
        const bodyHtml = getSafeHtmlBody(snippet.code);
        if (!bodyHtml) return null;
        return (
          <div
            className="chapmee-snippet-html"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
            data-chapmee-snippet={snippet.id}
            key={`html-${snippet.id}`}
            suppressHydrationWarning
          />
        );
      })}
    </>
  );
}
