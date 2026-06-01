import type { ReactNode } from "react";

type StudioSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  emphasized?: boolean;
};

export function StudioSectionHeader({
  action,
  emphasized = false,
  subtitle,
  title
}: StudioSectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2
          className={`font-bold text-white ${
            emphasized ? "text-base sm:text-lg lg:text-xl" : "text-sm sm:text-base lg:text-lg"
          }`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 hidden text-xs text-zinc-500 sm:block sm:text-sm">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
