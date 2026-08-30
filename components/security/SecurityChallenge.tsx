"use client";

import { useEffect, useRef, useState } from "react";
import { getTurnstileSiteKey, isTurnstileConfigured } from "@/lib/security/challenge-client";

type SecurityChallengeProps = {
  onToken: (token: string) => void;
  className?: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function SecurityChallenge({ className = "", onToken }: SecurityChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const siteKey = getTurnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !isTurnstileConfigured()) {
      return;
    }

    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.onload = () => setReady(true);
      document.head.appendChild(script);
    } else {
      setReady(true);
    }
  }, [siteKey]);

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.turnstile) {
      return;
    }

    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => onToken(token)
    });

    return () => {
      window.turnstile?.remove(widgetId);
    };
  }, [ready, siteKey, onToken]);

  if (!siteKey || !isTurnstileConfigured()) {
    return null;
  }

  return (
    <div className={className}>
      <p className="mb-2 text-sm text-amber-200/90">
        Xác minh nhanh để tiếp tục — chỉ hiện khi hệ thống phát hiện lưu lượng bất thường.
      </p>
      <div ref={containerRef} />
    </div>
  );
}
