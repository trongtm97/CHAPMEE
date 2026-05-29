"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type MilestoneToastState = {
  open: boolean;
  title: string | null;
  description: string | null;
  href: string | null;
  milestoneKey: string | null;
};

export function useMilestoneToast() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const milestoneKey = searchParams.get("milestoneKey") ?? searchParams.get("milestone");
  const title = searchParams.get("milestoneTitle");
  const description = searchParams.get("milestoneDescription");
  const href = searchParams.get("milestoneHref");

  const open = useMemo(
    () => Boolean(milestoneKey) && Boolean(title) && dismissed !== milestoneKey,
    [dismissed, milestoneKey, title]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("milestone");
      next.delete("milestoneKey");
      next.delete("milestoneTitle");
      next.delete("milestoneDescription");
      next.delete("milestoneHref");

      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setDismissed(milestoneKey);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [milestoneKey, open, pathname, router, searchParams]);

  return {
    dismiss: () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("milestone");
      next.delete("milestoneKey");
      next.delete("milestoneTitle");
      next.delete("milestoneDescription");
      next.delete("milestoneHref");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      setDismissed(milestoneKey);
    },
    notice: {
      description,
      href,
      milestoneKey,
      open,
      title
    } as MilestoneToastState
  };
}

