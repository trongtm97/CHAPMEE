"use client";

import { useState } from "react";
import { ShareModal } from "@/components/share/ShareModal";
import { Button } from "@/components/ui";
import type { ShareCardPayload } from "@/types/share";

type ShareButtonProps = {
  payload: ShareCardPayload;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
};

export function ShareButton({
  className,
  label = "Chia sẻ",
  payload,
  variant = "secondary"
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        variant={variant}
      >
        {label}
      </Button>
      <ShareModal
        onClose={() => setOpen(false)}
        open={open}
        payload={payload}
      />
    </>
  );
}
