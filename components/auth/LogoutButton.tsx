"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  variant?: "default" | "subtle";
};

export function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function handleLogout() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/me");
  }

  if (variant === "subtle") {
    return (
      <div className="text-center">
        {!confirming ? (
          <button
            className="text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
            onClick={() => setConfirming(true)}
            type="button"
          >
            Đăng xuất
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs text-zinc-500">Xác nhận đăng xuất?</span>
            <button
              className="text-xs font-semibold text-red-300"
              disabled={loading}
              onClick={() => void handleLogout()}
              type="button"
            >
              {loading ? "Đang xử lý..." : "Có"}
            </button>
            <button
              className="text-xs text-zinc-500"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Hủy
            </button>
          </div>
        )}
        {error ? <p className="mt-2 text-xs text-red-300">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        loading={loading}
        onClick={() => void handleLogout()}
        variant="secondary"
      >
        Đăng xuất
      </Button>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
