"use client";

import { useEffect, useState } from "react";
import { UserCoinLedgerTable } from "@/components/admin/UserCoinLedgerTable";
import { loadUserCoinLedgerAction } from "@/lib/admin/load-user-coin-ledger";
import type { UserCoinLedgerEntry } from "@/types/coins";

export function UserWalletLedgerSection({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<UserCoinLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadUserCoinLedgerAction(userId).then((result) => {
      if (!cancelled) {
        setEntries(result.entries ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return <p className="text-xs text-zinc-500">Đang tải ledger…</p>;
  }

  return <UserCoinLedgerTable entries={entries} />;
}
