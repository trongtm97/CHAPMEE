"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminCreatorListRow } from "@/types/admin-creator";
import type { CreatorModalType } from "@/components/admin/creators/CreatorActionModals";

type Props = {
  row: AdminCreatorListRow;
  onView: () => void;
  onOpenModal?: (type: CreatorModalType) => void;
  onOpenTab?: (tab: string) => void;
};

export function CreatorRowMenu({ row, onView, onOpenModal, onOpenTab }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items: { label: string; onClick?: () => void; href?: string }[] = [
    { label: "Xem chi tiết", onClick: () => { setOpen(false); onView(); } },
    row.username
      ? { label: "Mở hồ sơ công khai", href: `/tac-gia/${row.username}` }
      : { label: "Mở hồ sơ công khai", href: "#", onClick: () => setOpen(false) },
    { label: "Mở Studio admin", href: "/studio" },
    {
      label: "Duyệt kiếm tiền",
      onClick: () => {
        setOpen(false);
        onView();
        onOpenModal?.("approve_monetization");
      }
    },
    {
      label: "Tạm dừng kiếm tiền",
      onClick: () => {
        setOpen(false);
        onView();
        onOpenModal?.("suspend_monetization");
      }
    },
    {
      label: "Cấu hình tỷ lệ",
      onClick: () => {
        setOpen(false);
        onView();
        onOpenModal?.("revenue_share");
      }
    },
    {
      label: "Xem ví",
      onClick: () => {
        setOpen(false);
        onView();
        onOpenTab?.("payout");
      }
    },
    {
      label: "Xem audit log",
      onClick: () => {
        setOpen(false);
        onView();
        onOpenTab?.("audit");
      }
    }
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label="Thêm thao tác"
        className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-400 hover:border-white/20 hover:text-white"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        ···
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-xl border border-white/10 bg-[#0f1419] py-1 shadow-xl">
          {items.map((item) =>
            item.href && item.href !== "#" ? (
              <Link
                className="block px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
                href={item.href}
                key={item.label}
                onClick={() => setOpen(false)}
                target={item.href.startsWith("/tac-gia") ? "_blank" : undefined}
              >
                {item.label}
              </Link>
            ) : (
              <button
                className="block w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 hover:text-white"
                key={item.label}
                onClick={item.onClick}
                type="button"
              >
                {item.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  );
}
