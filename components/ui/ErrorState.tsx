import type { ReactNode } from "react";

type ErrorStateProps = {
  title?: string;
  message?: string | null;
  action?: ReactNode;
  className?: string;
  variant?: "warning" | "danger";
};

function isMissingSupabaseEnv(message: string) {
  return (
    message.includes("NEXT_PUBLIC_SUPABASE_URL") ||
    message.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
    message.toLowerCase().includes("missing required environment variable")
  );
}

function safeErrorMessage(message: string | null | undefined) {
  if (!message) {
    return "Something went wrong while loading this page. Please try again.";
  }

  if (process.env.NODE_ENV !== "production") {
    return message;
  }

  if (isMissingSupabaseEnv(message)) {
    return "App configuration is incomplete. A Supabase environment variable is missing.";
  }

  return "Something went wrong while loading this page. Please try again. If this keeps happening, check the server logs.";
}

export function ErrorState({
  action,
  className = "",
  message,
  title = "Could not load this section",
  variant = "warning"
}: ErrorStateProps) {
  const tone =
    variant === "danger"
      ? "border-red-400/30 bg-red-400/10 text-red-100"
      : "border-amber-400/30 bg-amber-400/10 text-amber-100";

  return (
    <div className={`rounded-[1.25rem] border p-5 ${tone} ${className}`} role="alert">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em]">{title}</h2>
      <p className="mt-2 text-sm leading-6 opacity-85">
        {safeErrorMessage(message)}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
