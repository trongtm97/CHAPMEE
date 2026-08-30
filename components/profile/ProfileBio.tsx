"use client";

import { useState } from "react";

type ProfileBioProps = {
  bio: string;
};

export function ProfileBio({ bio }: ProfileBioProps) {
  const [expanded, setExpanded] = useState(false);
  const long = bio.length > 160;

  return (
    <div className="mt-3">
      <p className={`text-sm leading-6 text-zinc-300 ${expanded ? "" : "line-clamp-3"}`}>
        {bio}
      </p>
      {long ? (
        <button
          className="mt-1 text-xs font-semibold text-cyan-200"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Thu gọn" : "Xem thêm"}
        </button>
      ) : null}
    </div>
  );
}
