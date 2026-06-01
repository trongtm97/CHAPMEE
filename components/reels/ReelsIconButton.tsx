import type { ReactNode } from "react";
import { ReelsCount } from "@/components/reels/ReelsCount";

type ReelsIconButtonProps = {
  active?: boolean;
  count?: number | null;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
};

export function ReelsIconButton({
  active = false,
  count = null,
  disabled = false,
  icon,
  onClick
}: ReelsIconButtonProps) {
  const showCount = typeof count === "number" && count > 0;

  return (
    <button
      className={`tap-highlight flex w-12 flex-col items-center gap-px text-center transition ${
        active ? "text-white" : "text-zinc-100"
      } ${disabled ? "opacity-60" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={`flex h-9 w-9 items-center justify-center ${
          active ? "text-[#ff4d6d]" : "text-white"
        }`}
      >
        {icon}
      </span>
      <span
        aria-hidden={!showCount}
        className={`flex min-h-[0.8rem] items-center justify-center ${
          showCount ? "opacity-100" : "opacity-0"
        }`}
      >
        <ReelsCount value={showCount ? count : 0} />
      </span>
    </button>
  );
}
