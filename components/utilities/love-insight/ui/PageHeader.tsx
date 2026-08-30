import type { ReactNode } from 'react';
import { Container } from "@/components/utilities/love-insight/layout/Container";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <Container className="pt-12 pb-6 text-center">
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
        {title}
      </h1>
      {description ? (
        <p className="mx-auto mt-4 max-w-2xl text-base text-lavender-200">
          {description}
        </p>
      ) : null}
    </Container>
  );
}
