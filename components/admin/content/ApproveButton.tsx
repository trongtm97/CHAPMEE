"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

type ApproveButtonProps = {
  label?: string;
};

export function ApproveButton({ label = "Approve" }: ApproveButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" loading={pending} type="submit">
      {label}
    </Button>
  );
}
