"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { readImportTextFile } from "@/lib/encoding/read-import-text-file";
import { BulkImportPreview } from "@/components/studio/import/BulkImportPreview";
import { BulkImportTemplateBox } from "@/components/studio/import/BulkImportTemplateBox";
import { Button } from "@/components/ui";
import {
  confirmBulkImportAction,
  previewBulkImportAction
} from "@/lib/import/bulk-import-actions";
import {
  BULK_IMPORT_OPTIONAL_FIELDS,
  BULK_IMPORT_REQUIRED_FIELDS,
  BULK_IMPORT_TEMPLATE_SHORT_PLACEHOLDER
} from "@/lib/import/bulk-import-template";
import { validateImportInputSize } from "@/lib/import/validate-import-chapters";
import { studioPath } from "@/lib/studio/constants";
import { countWords } from "@/lib/text/countWords";
import { buildImportChapterPreviews } from "@/lib/import/validate-import-chapters";
import {
  BULK_IMPORT_MAX_CHAPTERS,
  BULK_IMPORT_MAX_FILE_BYTES,
  type ImportChapterPreview
} from "@/types/import";

const BULK_IMPORT_MAX_FILE_MB = BULK_IMPORT_MAX_FILE_BYTES / (1024 * 1024);

type StudioBulkImportPageProps = {
  existingEpisodeNumbers: number[];
  storyId: string;
  storyTitle: string;
};

type ImportTab = "paste" | "file";

export function StudioBulkImportPage({
  existingEpisodeNumbers,
  storyId,
  storyTitle
}: StudioBulkImportPageProps) {
  const [tab, setTab] = useState<ImportTab>("paste");
  const [text, setText] = useState("");
  const [previews, setPreviews] = useState<ImportChapterPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const BLOCKING_STATUSES = new Set(["duplicate_in_file", "duplicate_in_story"]);
  const selectedCount = previews.filter((item) => item.selected).length;
  const importableCount = previews.filter(
    (item) => item.selected && !BLOCKING_STATUSES.has(item.status)
  ).length;

  const canPreview = useMemo(() => text.trim().length > 0, [text]);

  function handlePreviewsChange(next: ImportChapterPreview[]) {
    const rebuilt = buildImportChapterPreviews(
      next.map((item) => ({
        chapterNumber: item.chapterNumber,
        content: item.content,
        title: item.title,
        wordCount: countWords(item.content)
      })),
      existingEpisodeNumbers
    );

    const merged = rebuilt.map((item) => {
      const previous = next.find(
        (row) => row.chapterNumber === item.chapterNumber && row.title === item.title
      );

      return {
        ...item,
        selected: previous?.selected ?? item.selected
      };
    });

    setPreviews(merged);
  }

  function handlePreview() {
    setError(null);
    setParseErrors([]);

    const sizeCheck = validateImportInputSize(text);

    if (!sizeCheck.ok) {
      setError(sizeCheck.error ?? null);
      return;
    }

    startTransition(async () => {
      const result = await previewBulkImportAction({ storyId, text });

      if (result.error && (!result.previews || result.previews.length === 0)) {
        setError(result.error);
        setPreviews([]);
        setParseErrors(result.parseErrors ?? []);
        return;
      }

      setPreviews(result.previews);
      setParseErrors(result.parseErrors ?? []);

      if (result.previews.length === 0) {
        setError(result.error ?? "Không tìm thấy chương hợp lệ.");
      }
    });
  }

  function handleFileUpload(file: File | null) {
    setError(null);

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Hiện ChapMee chỉ hỗ trợ file .txt theo template mẫu.");
      return;
    }

    if (file.size > BULK_IMPORT_MAX_FILE_BYTES) {
      setError(`File quá lớn. Giới hạn ${BULK_IMPORT_MAX_FILE_MB}MB.`);
      return;
    }

    void readImportTextFile(file)
      .then((content) => {
        setText(content);
        setTab("paste");
      })
      .catch(() => {
        setError("Không đọc được file. Hãy lưu UTF-8 hoặc ANSI Windows.");
      });
  }

  function handleConfirmImport() {
    setError(null);

    startTransition(async () => {
      try {
        await confirmBulkImportAction({
          chapters: previews.map((item) => ({
            chapterNumber: item.chapterNumber,
            content: item.content,
            selected: item.selected,
            status: item.status,
            title: item.title
          })),
          storyId
        });
      } catch (submitError) {
        if (
          submitError &&
          typeof submitError === "object" &&
          "digest" in submitError &&
          String((submitError as { digest?: string }).digest).includes("NEXT_REDIRECT")
        ) {
          return;
        }

        setError(
          submitError instanceof Error
            ? submitError.message
            : "Nhập thất bại. Vui lòng thử lại."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
        <p className="font-semibold">Không đăng ngay</p>
        <p className="mt-1 text-amber-100/90">
          Nội dung nhập hàng loạt sẽ được lưu thành nháp. Bạn cần kiểm tra lại trước khi
          đăng.
        </p>
        <p className="mt-2 text-amber-100/80">
          Truyện đích: <span className="font-semibold text-white">{storyTitle}</span>
        </p>
        <p className="mt-2 text-xs text-amber-100/75">
          Cần import CSV/XLSX hoặc cập nhật chương cũ? Dùng{" "}
          <Link className="font-semibold text-cyan-200 underline" href={studioPath("/import?tab=import-chapters")}>
            Nhập chương CSV
          </Link>
          {" "}— xuất file tại{" "}
          <Link
            className="font-semibold text-cyan-200 underline"
            href={studioPath(`/import?tab=export&storyId=${storyId}`)}
          >
            Xuất chương
          </Link>
          {" "}để lấy mã.
        </p>
      </div>

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-zinc-300">
        <p className="font-semibold text-cyan-100">Quy tắc nhập — linh hoạt</p>
        <p className="mt-2 text-zinc-400">
          Chỉ cần đúng dòng <span className="font-mono text-cyan-100">=== CHƯƠNG SỐ ===</span>.
          Tiêu đề và nội dung có thể thiếu — hệ thống vẫn tạo nháp để bạn sửa sau.
          Một vài chương lỗi (trùng số) sẽ bị bỏ qua, các chương còn lại vẫn nhập bình thường.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {BULK_IMPORT_REQUIRED_FIELDS.map((item) => (
            <span
              className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-100"
              key={item.field}
            >
              Bắt buộc: {item.field}
            </span>
          ))}
          {BULK_IMPORT_OPTIONAL_FIELDS.map((item) => (
            <span
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-400"
              key={item.field}
            >
              Tùy chọn: {item.field}
            </span>
          ))}
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-500">
          <li>Nội dung nhập xong là nháp, chưa đăng công khai</li>
          <li>Tối đa {BULK_IMPORT_MAX_CHAPTERS} chương/lần — truyện dài hãy chia nhiều lần</li>
          <li>Chỉ hỗ trợ file .txt (UTF-8)</li>
        </ul>
      </div>

      <BulkImportTemplateBox />

      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            tab === "paste" ? "bg-cyan-300 text-zinc-950" : "text-zinc-400"
          }`}
          onClick={() => setTab("paste")}
          type="button"
        >
          Dán theo mẫu
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            tab === "file" ? "bg-cyan-300 text-zinc-950" : "text-zinc-400"
          }`}
          onClick={() => setTab("file")}
          type="button"
        >
          Tải file .txt
        </button>
      </div>

      {tab === "paste" ? (
        <div className="space-y-3">
          <label className="block space-y-2 text-sm">
            <span className="font-semibold text-zinc-200">Nội dung theo template</span>
            <textarea
              className="min-h-[20rem] w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm leading-relaxed text-zinc-100"
              onChange={(event) => setText(event.target.value)}
              placeholder={BULK_IMPORT_TEMPLATE_SHORT_PLACEHOLDER}
              value={text}
            />
          </label>
          <p className="text-xs text-zinc-500">
            Bạn có thể nhập tối đa {BULK_IMPORT_MAX_CHAPTERS} chương/lần (tối đa{" "}
            {BULK_IMPORT_MAX_FILE_MB}MB). Nếu truyện dài hơn, hãy chia thành nhiều lần nhập.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !canPreview} onClick={handlePreview} type="button">
              Xem trước
            </Button>
            <Button
              disabled={pending || !text}
              onClick={() => {
                setText("");
                setPreviews([]);
                setError(null);
              }}
              type="button"
              variant="secondary"
            >
              Xóa nội dung
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-zinc-400">
            Chọn file .txt (UTF-8, tối đa {BULK_IMPORT_MAX_FILE_MB}MB)
          </p>
          <input
            accept=".txt,text/plain"
            className="mx-auto mt-4 block text-sm text-zinc-300"
            onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
            type="file"
          />
          <a
            className="mt-4 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-200"
            download
            href="/templates/chapmee-bulk-import-template.txt"
          >
            Tải template .txt
          </a>
        </div>
      )}

      {parseErrors.length > 0 ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-sm text-amber-100">
          <p className="font-semibold">
            {previews.length > 0
              ? "Một số chương không đọc được — các chương hợp lệ vẫn xem trước bên dưới"
              : "Không đọc được chương nào"}
          </p>
          <ul className="mt-2 space-y-1 text-amber-100/90">
            {parseErrors.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {previews.length > 0 ? (
        <>
          <BulkImportPreview onChange={handlePreviewsChange} previews={previews} />

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={pending || importableCount === 0}
              onClick={() => setConfirmOpen(true)}
              type="button"
            >
              Nhập {importableCount} chương vào nháp
            </Button>
          </div>
        </>
      ) : null}

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-zinc-950 p-6">
            <h3 className="text-lg font-semibold text-white">Xác nhận nhập</h3>
            <p className="text-sm text-zinc-300">
              Sẽ nhập <span className="font-semibold text-white">{importableCount}</span>{" "}
              chương vào nháp
              {selectedCount > importableCount
                ? ` (${selectedCount - importableCount} chương trùng sẽ bỏ qua)`
                : ""}
              . Chưa đăng công khai — bạn có thể chỉnh sửa từng chương trước khi đăng.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={pending} onClick={handleConfirmImport} type="button">
                Nhập vào nháp
              </Button>
              <Button
                disabled={pending}
                onClick={() => setConfirmOpen(false)}
                type="button"
                variant="secondary"
              >
                Quay lại kiểm tra
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
