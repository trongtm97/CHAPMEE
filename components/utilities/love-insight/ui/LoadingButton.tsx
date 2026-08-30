'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

/**
 * Button có trạng thái loading với spinner inline.
 * Khi `loading` = true: disable + đổi text + show spinner.
 */
export function LoadingButton({
  loading = false,
  loadingText,
  variant = 'primary',
  disabled,
  className,
  children,
  ...rest
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <button
      type="submit"
      className={`${baseClass} w-full ${className ?? ''}`.trim()}
      disabled={isDisabled}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Spinner />
          <span>{loadingText ?? 'Đang xử lý…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
