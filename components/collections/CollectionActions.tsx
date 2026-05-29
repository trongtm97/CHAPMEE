"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { AddToCollectionSheet } from "@/components/collections/AddToCollectionSheet";

type CollectionActionsProps = {
  storyId: string;
  storyTitle: string;
  loggedIn: boolean;
};

export function CollectionActions({ storyId, storyTitle, loggedIn }: CollectionActionsProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="w-full min-h-12"
        onClick={() => setOpen(true)}
        type="button"
        variant="ghost"
      >
        Thêm vào tủ
      </Button>
      {!loggedIn ? (
        <p className="text-center text-xs leading-5 text-zinc-500">
          Đăng nhập để thêm truyện vào collection.
        </p>
      ) : null}
      {open ? (
        <AddToCollectionSheet
          onClose={() => setOpen(false)}
          storyId={storyId}
          storyTitle={storyTitle}
        />
      ) : null}
    </>
  );
}
