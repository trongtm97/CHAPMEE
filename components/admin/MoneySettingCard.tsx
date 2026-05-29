import type { ReactNode } from "react";
import { Card } from "@/components/ui";

type MoneySettingCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  id?: string;
};

export function MoneySettingCard({
  title,
  description,
  children,
  className = "",
  id
}: MoneySettingCardProps) {
  return (
    <Card className={`scroll-mt-28 space-y-4 ${className}`} id={id}>
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
