import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'main' | 'article' | 'header' | 'footer';
}

export function Container({
  children,
  className,
  as: Tag = 'div',
}: ContainerProps) {
  return (
    <Tag
      className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}
    >
      {children}
    </Tag>
  );
}
