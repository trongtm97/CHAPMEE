import type { ReactNode } from 'react';
import { Container } from '@/components/layout/Container';

interface SectionProps {
  /** Optional eyebrow text (small uppercase above title). */
  eyebrow?: string;
  title: string;
  /** Optional sub-text under the title. */
  description?: ReactNode;
  children: ReactNode;
  /** Override the outer container — e.g. to remove default padding. */
  className?: string;
  /** When true, render with less vertical padding (for tight layouts). */
  compact?: boolean;
}

/**
 * Section chuẩn cho result page — title + description + body.
 * Dùng để thống nhất layout giữa các khối (Trust, Breakdown, Strengths...).
 */
export function Section({
  eyebrow,
  title,
  description,
  children,
  className,
  compact,
}: SectionProps) {
  return (
    <Container className={compact ? 'py-6' : 'py-10'}>
      <header className="mb-6 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-display text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm text-lavender-300">{description}</p>
        ) : null}
      </header>
      <div className={className}>{children}</div>
    </Container>
  );
}