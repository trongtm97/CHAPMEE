type UtilityStarIconProps = {
  className?: string;
};

/** Ngôi sao 5 cánh màu xanh lá — icon tiện ích ChapMee. */
export function UtilityStarIcon({ className = "size-4" }: UtilityStarIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 15.9l-4.94 2.6.94-5.5-4-3.9 5.53-.8L12 2.5z" />
    </svg>
  );
}
