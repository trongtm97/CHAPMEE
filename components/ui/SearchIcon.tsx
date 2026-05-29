type SearchIconProps = {
  className?: string;
};

/** Icon kính lúp dùng chung cho nút submit tìm kiếm trong app. */
export function SearchIcon({ className = "size-4" }: SearchIconProps) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}
