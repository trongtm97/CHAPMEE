import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

/** Card huyền bí — dùng cho form, panel, kết quả, nội dung bài viết. */
export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div className={cn('card-mystic', className)}>
      {title ? (
        <div className="mb-4">
          <h2 className="text-display text-lg font-bold text-white sm:text-xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-lavender-300/80">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
