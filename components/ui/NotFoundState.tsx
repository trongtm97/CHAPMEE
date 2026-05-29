import Link from "next/link";
import type { ReactNode } from "react";

type NotFoundStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function NotFoundState({
  action,
  className = "",
  description = "The page you are looking for is not available or may have moved.",
  title = "Page not found"
}: NotFoundStateProps) {
  return (
    <section className={`chap-card p-6 text-center ${className}`}>
      <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
        404
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-normal text-white">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
        {description}
      </p>
      <div className="mt-6">
        {action ?? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-950 transition hover:bg-cyan-200"
            href="/"
          >
            Back to home
          </Link>
        )}
      </div>
    </section>
  );
}
