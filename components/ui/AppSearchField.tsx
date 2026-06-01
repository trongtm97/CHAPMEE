import { SearchIcon } from "@/components/ui/SearchIcon";

export const APP_SEARCH_PLACEHOLDER = "Tìm truyện, tác giả, thể loại, tag…";

type AppSearchFieldProps = {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  variant?: "pill" | "field";
  showSubmit?: boolean;
  submitAriaLabel?: string;
  autoFocus?: boolean;
};

const variantClasses = {
  pill: {
    input:
      "h-11 w-full rounded-full border border-white/10 bg-white/[0.04] py-2 pl-4 pr-11 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300/50",
    button:
      "absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-zinc-300 transition hover:bg-white/10 hover:text-cyan-200"
  },
  field: {
    input:
      "h-10 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 pr-11 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300/50",
    button:
      "absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-300 transition hover:bg-white/10 hover:text-cyan-200"
  }
} as const;

export function AppSearchField({
  autoFocus = false,
  className = "",
  defaultValue,
  inputClassName = "",
  name = "q",
  onChange,
  placeholder = APP_SEARCH_PLACEHOLDER,
  showSubmit = true,
  submitAriaLabel = "Tìm kiếm",
  value,
  variant = "pill"
}: AppSearchFieldProps) {
  const styles = variantClasses[variant];
  const isControlled = value !== undefined;

  return (
    <div className={`relative ${className}`.trim()}>
      <input
        autoFocus={autoFocus}
        className={`${styles.input} ${inputClassName}`.trim()}
        defaultValue={isControlled ? undefined : defaultValue}
        name={showSubmit ? name : undefined}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        placeholder={placeholder}
        type="search"
        value={isControlled ? value : undefined}
      />
      {showSubmit ? (
        <button aria-label={submitAriaLabel} className={styles.button} type="submit">
          <SearchIcon />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className={`pointer-events-none ${styles.button.replace("hover:bg-white/10 hover:text-cyan-200", "")}`}
        >
          <SearchIcon />
        </span>
      )}
    </div>
  );
}
