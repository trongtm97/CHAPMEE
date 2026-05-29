import type { PublicVerificationBadge } from "@/types/verification";

type VerifiedBadgeProps = {
  badge: PublicVerificationBadge | null | undefined;
  size?: "xs" | "sm";
  className?: string;
};

const sizeClasses = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4"
};

export function VerifiedBadge({ badge, className = "", size = "sm" }: VerifiedBadgeProps) {
  if (!badge) {
    return null;
  }

  return (
    <span
      aria-label={badge.label}
      className={`inline-flex shrink-0 items-center text-sky-400 ${className}`}
      title={badge.label}
    >
      <svg
        aria-hidden="true"
        className={sizeClasses[size]}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          clipRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          fillRule="evenodd"
        />
      </svg>
    </span>
  );
}

type VerifiedNameProps = {
  name: string;
  badge: PublicVerificationBadge | null | undefined;
  className?: string;
  nameClassName?: string;
};

export function VerifiedName({
  badge,
  className = "",
  name,
  nameClassName = ""
}: VerifiedNameProps) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 ${className}`}>
      <span className={`truncate ${nameClassName}`}>{name}</span>
      <VerifiedBadge badge={badge} size="xs" />
    </span>
  );
}
