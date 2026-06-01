"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  exportComposerSettingsAction,
  importComposerSettingsAction,
  listComposerAuditLogsAction,
  loadComposerAdminSettingsAction,
  restoreComposerDefaultsAction,
  saveComposerBlockTypesAction,
  saveComposerModesAction,
  saveComposerValidationSettingsAction
} from "@/lib/admin/composer-settings-actions";
import { listFormatTemplatesAdminAction } from "@/lib/admin/taxonomy-actions";
import { getDefaultComposerAdminSettings } from "@/lib/composer/composer-settings-defaults";
import type {
  ComposerAdminSettingsBundle,
  ComposerBlockTypeRegistryEntry,
  ComposerModeRegistryEntry,
  ComposerValidationSettings
} from "@/lib/composer/composer-settings";
import { Button, Input } from "@/components/ui";
import type { ComposerMode } from "@/lib/composer/types";
import Link from "next/link";

type TabId =
  | "overview"
  | "validation"
  | "modes"
  | "blocks"
  | "templates"
  | "audit";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Tổng quan" },
  { id: "validation", label: "Validation" },
  { id: "modes", label: "Composer modes" },
  { id: "blocks", label: "Block types" },
  { id: "templates", label: "Templates" },
  { id: "audit", label: "Audit" }
];

const VALIDATION_BOOLEAN_RULES: Array<{
  key: keyof ComposerValidationSettings;
  label: string;
  description: string;
  group: "publishing" | "structure";
}> = [
  {
    key: "require_publishing_check",
    label: "Bắt buộc Publishing Check",
    description: "Luôn chạy kiểm tra trước khi gửi duyệt hoặc publish.",
    group: "publishing"
  },
  {
    key: "require_preview_before_publish",
    label: "Bắt buộc preview trước publish",
    description: "Tác giả cần xem preview tối thiểu một lần.",
    group: "publishing"
  },
  {
    key: "block_publish_when_critical",
    label: "Không cho publish nếu có lỗi critical",
    description: "Chặn publish khi có lỗi mức nghiêm trọng.",
    group: "publishing"
  },
  {
    key: "allow_publish_with_warning",
    label: "Cho publish nếu chỉ có warning",
    description: "Cảnh báo không chặn publish.",
    group: "publishing"
  },
  {
    key: "require_ownership_confirmation",
    label: "Bắt buộc xác nhận quyền sở hữu",
    description: "Phải xác nhận quyền nội dung trước khi gửi duyệt.",
    group: "publishing"
  },
  {
    key: "require_sensitive_tag_warning_confirmation",
    label: "Bắt buộc xác nhận cảnh báo tag nhạy cảm",
    description: "Nếu có tag nhạy cảm, yêu cầu xác nhận bắt buộc.",
    group: "publishing"
  },
  {
    key: "check_invalid_block_schema",
    label: "Kiểm tra block lỗi schema",
    description: "Phát hiện block thiếu field hoặc sai kiểu.",
    group: "structure"
  },
  {
    key: "check_empty_blocks",
    label: "Kiểm tra block trống",
    description: "Cảnh báo block rỗng hoặc thiếu nội dung.",
    group: "structure"
  },
  {
    key: "check_block_order",
    label: "Kiểm tra thứ tự block",
    description: "Đảm bảo block order hợp lệ.",
    group: "structure"
  },
  {
    key: "check_missing_chat_character",
    label: "Kiểm tra nhân vật thiếu trong chat story",
    description: "Tin nhắn chat phải có nhân vật tương ứng.",
    group: "structure"
  },
  {
    key: "check_branching_dead_ends",
    label: "Kiểm tra lựa chọn nhánh bị cụt",
    description: "Node branching cần có target hợp lệ.",
    group: "structure"
  },
  {
    key: "check_unused_media",
    label: "Kiểm tra media upload nhưng chưa dùng",
    description: "Giảm rác media không dùng.",
    group: "structure"
  },
  {
    key: "check_system_game_required_panels",
    label: "Kiểm tra system_game thiếu stat/quest/reward",
    description: "Mode system_game cần đủ panel cốt lõi.",
    group: "structure"
  },
  {
    key: "check_case_file_required_sections",
    label: "Kiểm tra case_file thiếu evidence/timeline",
    description: "Mode case_file cần đủ section điều tra.",
    group: "structure"
  }
];

const VALIDATION_LIMIT_FIELDS: Array<{
  key: keyof ComposerValidationSettings;
  label: string;
}> = [
  { key: "max_blocks_per_chapter", label: "Max blocks/chương" },
  { key: "max_timeline_items", label: "Max timeline items" },
  { key: "max_stats_items", label: "Max stats items" },
  { key: "max_evidence_items", label: "Max evidence items" },
  { key: "max_characters_per_message", label: "Max characters per message" },
  { key: "max_media_items_per_chapter", label: "Max media items/chương" },
  { key: "max_branch_depth", label: "Max branch depth" },
  { key: "max_options_per_choice_block", label: "Max options per choice block" }
];

export function AdminStoryFormatsPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const [settings, setSettings] = useState<ComposerAdminSettingsBundle>(
    getDefaultComposerAdminSettings()
  );
  const [message, setMessage] = useState<string | null>(null);
  const [blockQuery, setBlockQuery] = useState("");
  const [blockCategoryFilter, setBlockCategoryFilter] = useState("all");
  const [blockModeFilter, setBlockModeFilter] = useState("all");
  const [blockStatusFilter, setBlockStatusFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<
    Awaited<ReturnType<typeof listComposerAuditLogsAction>>["logs"]
  >([]);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const result = await loadComposerAdminSettingsAction();
      if (result.error) {
        setMessage(result.error);
      }
      setSettings(result.settings);
      const audit = await listComposerAuditLogsAction({ page: 1 });
      if (!audit.error) {
        setAuditLogs(audit.logs);
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const validation = settings.validation;
  const warningItems = useMemo(() => {
    const items: string[] = [];
    const activeModes = settings.modes.filter((item) => item.is_active);
    for (const mode of activeModes) {
      const hasBlocks = settings.blockTypes.some(
        (block) => block.is_active && block.modes.includes(mode.mode)
      );
      if (!hasBlocks) {
        items.push(`Mode ${mode.label} đang bật nhưng chưa có block hoạt động.`);
      }
      const hasTemplate = settings.templates.some(
        (tpl) => tpl.active && tpl.mode_key === mode.mode
      );
      if (mode.is_creator_selectable && !hasTemplate) {
        items.push(`Mode ${mode.label} cho tác giả chọn nhưng chưa có template.`);
      }
    }
    const unassignedActiveBlocks = settings.blockTypes.filter(
      (block) => block.is_active && block.modes.length === 0
    );
    if (unassignedActiveBlocks.length > 0) {
      items.push(`${unassignedActiveBlocks.length} block đang bật nhưng chưa gán mode.`);
    }
    if (validation.require_publishing_check && !validation.check_invalid_block_schema) {
      items.push("Publishing check đang bật nhưng tắt kiểm tra schema block.");
    }
    return items;
  }, [settings, validation.check_invalid_block_schema, validation.require_publishing_check]);

  const blockCategories = useMemo(
    () =>
      Array.from(new Set(settings.blockTypes.map((item) => item.category)))
        .filter(Boolean)
        .sort(),
    [settings.blockTypes]
  );

  const filteredBlocks = useMemo(() => {
    const q = blockQuery.trim().toLowerCase();
    return settings.blockTypes.filter((block) => {
      if (blockCategoryFilter !== "all" && block.category !== blockCategoryFilter) {
        return false;
      }
      if (blockModeFilter !== "all" && !block.modes.includes(blockModeFilter as ComposerMode)) {
        return false;
      }
      if (blockStatusFilter === "active" && !block.is_active) return false;
      if (blockStatusFilter === "inactive" && block.is_active) return false;
      if (blockStatusFilter === "creator" && !block.is_creator_selectable) return false;
      if (!q) return true;
      return (
        block.block_type.toLowerCase().includes(q) ||
        block.label.toLowerCase().includes(q) ||
        block.description.toLowerCase().includes(q)
      );
    });
  }, [blockCategoryFilter, blockModeFilter, blockQuery, blockStatusFilter, settings.blockTypes]);

  function patchValidation(patch: Partial<ComposerValidationSettings>) {
    setSettings({
      ...settings,
      validation: { ...settings.validation, ...patch }
    });
  }

  function patchMode(mode: ComposerModeRegistryEntry["mode"], patch: Partial<ComposerModeRegistryEntry>) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modes: prev.modes.map((item) => (item.mode === mode ? { ...item, ...patch } : item))
      };
    });
  }

  function patchBlock(
    blockType: ComposerBlockTypeRegistryEntry["block_type"],
    patch: Partial<ComposerBlockTypeRegistryEntry>
  ) {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blockTypes: prev.blockTypes.map((item) =>
          item.block_type === blockType ? { ...item, ...patch } : item
        )
      };
    });
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-cyan-400/20 bg-cyan-950/10 p-5">
        <h1 className="text-2xl font-bold text-white">Định dạng truyện & Composer</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Quản lý mode trình bày, block, validation và template dùng cho Studio Composer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const validationRes = await saveComposerValidationSettingsAction(settings.validation);
                if (validationRes.error) return setMessage(validationRes.error);
                const modeRes = await saveComposerModesAction(settings.modes);
                if (modeRes.error) return setMessage(modeRes.error);
                const blockRes = await saveComposerBlockTypesAction(settings.blockTypes);
                setMessage(blockRes.error ?? "Đã lưu toàn bộ thay đổi.");
              })
            }
            type="button"
          >
            Lưu thay đổi
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await restoreComposerDefaultsAction();
                setMessage(result.error ?? "Đã khôi phục mặc định.");
                if (!result.error) load();
              })
            }
            type="button"
            variant="secondary"
          >
            Khôi phục mặc định
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await exportComposerSettingsAction();
                if (result.error || !result.payload) {
                  setMessage(result.error ?? "Không thể xuất cấu hình.");
                  return;
                }
                const blob = new Blob([result.payload], { type: "application/json;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `chapmee-composer-settings-${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setMessage("Đã xuất cấu hình.");
              })
            }
            type="button"
            variant="secondary"
          >
            Xuất cấu hình
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const input = window.prompt("Dán JSON cấu hình để nhập");
              if (!input?.trim()) return;
              startTransition(async () => {
                const result = await importComposerSettingsAction({ payload: input });
                setMessage(result.error ?? "Đã nhập cấu hình.");
                if (!result.error) load();
              });
            }}
            type="button"
            variant="secondary"
          >
            Nhập cấu hình
          </Button>
          <Button onClick={() => setTab("audit")} type="button" variant="secondary">
            Xem audit
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Tổng composer modes</p>
          <p className="text-xl font-semibold text-white">{settings.modes.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Mode đang bật</p>
          <p className="text-xl font-semibold text-white">
            {settings.modes.filter((item) => item.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Mode tác giả được chọn</p>
          <p className="text-xl font-semibold text-white">
            {settings.modes.filter((item) => item.is_active && item.is_creator_selectable).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Tổng block types</p>
          <p className="text-xl font-semibold text-white">{settings.blockTypes.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Block đang bật</p>
          <p className="text-xl font-semibold text-white">
            {settings.blockTypes.filter((item) => item.is_active).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Templates đang có</p>
          <p className="text-xl font-semibold text-white">{settings.templates.length || 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Validation rules đang bật</p>
          <p className="text-xl font-semibold text-white">
            {VALIDATION_BOOLEAN_RULES.filter((item) => Boolean(validation[item.key])).length}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <p className="text-xs text-zinc-500">Cảnh báo cấu hình</p>
          <p className="text-xl font-semibold text-amber-300">{warningItems.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label }) => (
          <button
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              tab === id ? "bg-cyan-500/20 text-cyan-100" : "bg-white/5 text-zinc-400"
            }`}
            key={id}
            onClick={() => setTab(id)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {message}
        </p>
      ) : null}

      {tab === "overview" ? (
        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 p-4">
            <p className="text-sm font-semibold text-white">System health</p>
            {warningItems.length === 0 ? (
              <p className="mt-2 text-sm text-emerald-300">Không phát hiện cảnh báo cấu hình.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-amber-200">
                {warningItems.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            )}
          </section>
          <section className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Tên hiển thị</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Tác giả chọn</th>
                  <th className="px-3 py-2">Block bật</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Validation</th>
                  <th className="px-3 py-2">Usage</th>
                  <th className="px-3 py-2">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {settings.modes.map((mode) => {
                  const activeBlocks = settings.blockTypes.filter(
                    (block) => block.is_active && block.modes.includes(mode.mode)
                  ).length;
                  const templates = settings.templates.filter(
                    (tpl) => tpl.mode_key === mode.mode && tpl.active
                  ).length;
                  return (
                    <tr key={mode.mode}>
                      <td className="px-3 py-2 font-mono text-xs text-cyan-200">{mode.mode}</td>
                      <td className="px-3 py-2 text-white">{mode.label}</td>
                      <td className="px-3 py-2">{mode.is_active ? "Bật" : "Tắt"}</td>
                      <td className="px-3 py-2">{mode.is_creator_selectable ? "Có" : "Không"}</td>
                      <td className="px-3 py-2">{activeBlocks}</td>
                      <td className="px-3 py-2">{templates}</td>
                      <td className="px-3 py-2">
                        {validation.require_publishing_check ? "Checking" : "Bypass"}
                      </td>
                      <td className="px-3 py-2 text-zinc-500">Chưa có bảng usage</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            className="text-cyan-300 hover:underline"
                            onClick={() => setTab("modes")}
                            type="button"
                          >
                            Sửa
                          </button>
                          <button
                            className="text-zinc-400 hover:underline"
                            onClick={() => setTab("templates")}
                            type="button"
                          >
                            Xem preview
                          </button>
                          <button
                            className="text-zinc-400 hover:underline"
                            onClick={() => patchMode(mode.mode, { is_active: !mode.is_active })}
                            type="button"
                          >
                            {mode.is_active ? "Tắt" : "Bật"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === "validation" ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Thay đổi validation có thể ảnh hưởng đến tác giả khi gửi duyệt.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {(["publishing", "structure"] as const).map((group) => (
              <section className="rounded-xl border border-white/10 p-4" key={group}>
                <p className="mb-3 text-sm font-semibold text-white">
                  {group === "publishing" ? "Publishing checks" : "Structure checks"}
                </p>
                <div className="space-y-3">
                  {VALIDATION_BOOLEAN_RULES.filter((item) => item.group === group).map((rule) => (
                    <label className="block rounded-lg border border-white/10 p-3" key={rule.key}>
                      <span className="flex items-center gap-2 text-sm text-zinc-100">
                        <input
                          checked={Boolean(validation[rule.key])}
                          onChange={(event) =>
                            patchValidation({ [rule.key]: event.target.checked } as Partial<ComposerValidationSettings>)
                          }
                          type="checkbox"
                        />
                        {rule.label}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">{rule.description}</span>
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <section className="rounded-xl border border-white/10 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Limits</p>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {VALIDATION_LIMIT_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  onChange={(event) =>
                    patchValidation({
                      [field.key]: Math.max(0, Number(event.target.value) || 0)
                    } as Partial<ComposerValidationSettings>)
                  }
                  type="number"
                  value={String(validation[field.key])}
                />
              ))}
            </div>
          </section>
          <section className="rounded-xl border border-white/10 p-4">
            <p className="mb-3 text-sm font-semibold text-white">Severity mapping</p>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.keys(validation.severity_map ?? {}).map((code) => (
                <label className="space-y-1 text-sm" key={code}>
                  <span className="text-zinc-300">{code}</span>
                  <select
                    className="min-h-10 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-zinc-100"
                    onChange={(event) =>
                      patchValidation({
                        severity_map: {
                          ...validation.severity_map,
                          [code]: event.target.value as "error" | "warning" | "info" | "disabled"
                        }
                      })
                    }
                    value={validation.severity_map[code]}
                  >
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
              ))}
            </div>
          </section>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await saveComposerValidationSettingsAction(settings.validation);
                  setMessage(res.error ?? "Đã lưu validation.");
                })
              }
              type="button"
            >
              Lưu validation
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await restoreComposerDefaultsAction();
                  setMessage(res.error ?? "Đã reset validation mặc định.");
                  if (!res.error) load();
                })
              }
              type="button"
              variant="secondary"
            >
              Reset validation mặc định
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "modes" ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Mô tả</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Creator selectable</th>
                  <th className="px-3 py-2">Single</th>
                  <th className="px-3 py-2">Multi</th>
                  <th className="px-3 py-2">Blocks</th>
                  <th className="px-3 py-2">Templates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {settings.modes.map((row) => (
                  <tr key={row.mode}>
                    <td className="px-3 py-2 font-mono text-xs text-cyan-200">{row.mode}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
                        onChange={(event) => patchMode(row.mode, { label: event.target.value })}
                        value={row.label}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
                        onChange={(event) =>
                          patchMode(row.mode, { description: event.target.value })
                        }
                        value={row.description}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.is_active}
                        onChange={(event) => patchMode(row.mode, { is_active: event.target.checked })}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.is_creator_selectable}
                        onChange={(event) =>
                          patchMode(row.mode, { is_creator_selectable: event.target.checked })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.supports_single_part_story}
                        onChange={(event) =>
                          patchMode(row.mode, { supports_single_part_story: event.target.checked })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.supports_multi_chapter_story}
                        onChange={(event) =>
                          patchMode(row.mode, { supports_multi_chapter_story: event.target.checked })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {settings.blockTypes.filter(
                        (block) => block.is_active && block.modes.includes(row.mode)
                      ).length}
                    </td>
                    <td className="px-3 py-2">
                      {settings.templates.filter((tpl) => tpl.mode_key === row.mode && tpl.active).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await saveComposerModesAction(settings.modes);
                setMessage(res.error ?? "Đã lưu modes.");
              });
            }}
            type="button"
          >
            Lưu modes
          </Button>
        </div>
      ) : null}

      {tab === "blocks" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Runtime dùng merged config: default từ code + admin override từ DB. Nếu DB rỗng sẽ fallback mặc định.
          </p>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            <input
              className="min-h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
              onChange={(event) => setBlockQuery(event.target.value)}
              placeholder="Search block..."
              value={blockQuery}
            />
            <select
              className="min-h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
              onChange={(event) => setBlockCategoryFilter(event.target.value)}
              value={blockCategoryFilter}
            >
              <option value="all">All category</option>
              {blockCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="min-h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
              onChange={(event) => setBlockModeFilter(event.target.value)}
              value={blockModeFilter}
            >
              <option value="all">All mode</option>
              {settings.modes.map((mode) => (
                <option key={mode.mode} value={mode.mode}>
                  {mode.label}
                </option>
              ))}
            </select>
            <select
              className="min-h-10 rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
              onChange={(event) => setBlockStatusFilter(event.target.value)}
              value={blockStatusFilter}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="creator">Not creator selectable</option>
            </select>
            <Button
              onClick={() => {
                const targetMode = blockModeFilter !== "all" ? (blockModeFilter as ComposerMode) : null;
                if (!targetMode) return;
                const merged = settings.blockTypes.map((block) =>
                  block.modes.includes(targetMode) ? { ...block, is_active: true } : block
                );
                setSettings({ ...settings, blockTypes: merged });
              }}
              type="button"
              variant="secondary"
            >
              Bulk bật theo mode
            </Button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Allowed modes</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Creator selectable</th>
                  <th className="px-3 py-2">Mobile preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBlocks.map((row) => (
                  <tr key={row.block_type}>
                    <td className="px-3 py-2 font-mono text-xs text-cyan-200">{row.block_type}</td>
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded border border-white/10 bg-zinc-950 px-2 py-1 text-zinc-100"
                        onChange={(event) => patchBlock(row.block_type, { label: event.target.value })}
                        value={row.label}
                      />
                    </td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 text-xs text-zinc-300">{row.modes.join(", ")}</td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.is_active}
                        onChange={(event) => patchBlock(row.block_type, { is_active: event.target.checked })}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.is_creator_selectable}
                        onChange={(event) =>
                          patchBlock(row.block_type, {
                            is_creator_selectable: event.target.checked
                          })
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        checked={row.supports_mobile_preview}
                        onChange={(event) =>
                          patchBlock(row.block_type, { supports_mobile_preview: event.target.checked })
                        }
                        type="checkbox"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const res = await saveComposerBlockTypesAction(settings.blockTypes);
                setMessage(res.error ?? "Đã lưu block types.");
              });
            }}
            type="button"
          >
            Lưu block types
          </Button>
        </div>
      ) : null}

      {tab === "templates" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">
            Template Composer dùng chung từ taxonomy format templates để tránh duplicate logic.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                startTransition(async () => {
                  const result = await listFormatTemplatesAdminAction();
                  if (result.error) setMessage(result.error);
                  else {
                    setSettings({
                      ...settings,
                      templates: result.items.map((item) => ({
                        id: item.id,
                        name: item.name,
                        slug: item.name.toLowerCase().replace(/\s+/g, "-"),
                        mode_key: item.mode as ComposerMode,
                        content_structure: "both",
                        description: item.description,
                        starter_blocks_json: item.example_json ?? {},
                        preview_text: item.description ?? null,
                        active: item.is_active,
                        creator_selectable: true,
                        sort_order: item.sort_order,
                        updated_at: item.updated_at
                      }))
                    });
                    setMessage("Đã đồng bộ templates từ taxonomy.");
                  }
                })
              }
              type="button"
              variant="secondary"
            >
              Validate templates
            </Button>
            <Link className="text-sm text-cyan-300 hover:underline" href="/admin/taxonomy?tab=templates">
              Mở màn hình Templates chi tiết →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Tên template</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Cấu trúc</th>
                  <th className="px-3 py-2">Số key JSON</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {settings.templates.map((template) => (
                  <tr key={template.id}>
                    <td className="px-3 py-2 text-white">{template.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-cyan-200">{template.mode_key}</td>
                    <td className="px-3 py-2">{template.content_structure}</td>
                    <td className="px-3 py-2">
                      {Object.keys(template.starter_blocks_json ?? {}).length}
                    </td>
                    <td className="px-3 py-2">{template.active ? "Bật" : "Tắt"}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {template.preview_text ?? "Chưa có mô tả preview"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "audit" ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-400">Audit log thay đổi cấu hình Composer.</p>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="border-b border-white/10 bg-zinc-950/60 text-zinc-500">
                <tr>
                  <th className="px-3 py-2">Thời gian</th>
                  <th className="px-3 py-2">Người thay đổi</th>
                  <th className="px-3 py-2">Loại thay đổi</th>
                  <th className="px-3 py-2">Object</th>
                  <th className="px-3 py-2">Before/After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {new Date(log.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2">{log.actor?.display_name ?? log.actor?.username ?? "—"}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">
                      {log.target_type ?? "—"} {log.target_id ? `(${log.target_id})` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      {log.metadata ? JSON.stringify(log.metadata).slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
