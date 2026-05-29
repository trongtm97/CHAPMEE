"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui";

type RejectButtonProps = {
  label?: string;
};

export function RejectButton({ label = "Reject" }: RejectButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      loading={pending}
      onClick={(event) => {
        if (!confirm("Bạn chắc chắn muốn reject nội dung này?")) {
          event.preventDefault();
        }
      }}
      type="submit"
      variant="danger"
    >
      {label}
    </Button>
  );
}
