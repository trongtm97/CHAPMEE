"use client";

import {
  tplBtnPrimary,
  tplBtnSecondary
} from "@/components/studio/templates/shared/styles";

type TemplateHeaderProps = {
  onCreate: () => void;
};

export function TemplateHeader({ onCreate }: TemplateHeaderProps) {
  return (
    <div className="space-y-3">
      <nav aria-label="Breadcrumb" className="text-xs text-zinc-500">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <a className="hover:text-zinc-300" href="/studio">
              Studio
            </a>
          </li>
          <li aria-hidden>/</li>
          <li className="text-zinc-400">Mẫu nội dung</li>
        </ol>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-white sm:text-2xl">Mẫu nội dung</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Lưu và dùng lại các mẫu viết quen thuộc trong ChapMee Studio.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className={tplBtnSecondary}
            disabled
            title="Nhập mẫu từ file — đang chuẩn bị"
            type="button"
          >
            Nhập mẫu
          </button>
          <button className={tplBtnPrimary} onClick={onCreate} type="button">
            Tạo mẫu
          </button>
        </div>
      </div>
    </div>
  );
}
