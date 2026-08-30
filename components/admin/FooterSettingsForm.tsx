"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FooterPreview } from "@/components/admin/FooterPreview";
import {
  resetFooterSettingsAction,
  updateFooterSettingsAction
} from "@/lib/admin/footer-settings-actions";
import { INITIAL_FOOTER_SETTINGS_ACTION_STATE } from "@/lib/admin/footer-settings-state";
import {
  type FooterColumn,
  type FooterConfig,
  type FooterCustomBadge,
  type FooterLegalLink
} from "@/lib/settings/footer-config";
import { Button, Card, Input, Textarea } from "@/components/ui";

type TabId =
  | "general"
  | "columns"
  | "legal"
  | "compliance"
  | "contact"
  | "preview";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Chung" },
  { id: "columns", label: "Cột footer" },
  { id: "legal", label: "Liên kết pháp lý" },
  { id: "compliance", label: "Badge tuân thủ" },
  { id: "contact", label: "Liên hệ chính thức" },
  { id: "preview", label: "Xem trước" }
];

type FooterSettingsFormProps = {
  initialConfig: FooterConfig;
  updatedAt: string | null;
};

export function FooterSettingsForm({
  initialConfig,
  updatedAt
}: FooterSettingsFormProps) {
  const [config, setConfig] = useState<FooterConfig>(initialConfig);
  const [tab, setTab] = useState<TabId>("general");
  const initialPayloadRef = useRef(JSON.stringify(initialConfig));

  const [saveState, saveAction, savePending] = useActionState(
    updateFooterSettingsAction,
    { ...INITIAL_FOOTER_SETTINGS_ACTION_STATE, config: initialConfig }
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetFooterSettingsAction,
    INITIAL_FOOTER_SETTINGS_ACTION_STATE
  );

  useEffect(() => {
    if (saveState.ok && saveState.config) {
      setConfig(saveState.config);
      initialPayloadRef.current = JSON.stringify(saveState.config);
    }
  }, [saveState.ok, saveState.config]);

  useEffect(() => {
    if (resetState.ok && resetState.config) {
      setConfig(resetState.config);
      initialPayloadRef.current = JSON.stringify(resetState.config);
    }
  }, [resetState.ok, resetState.config]);

  const payload = JSON.stringify(config);
  const isDirty = payload !== initialPayloadRef.current;
  const fieldErrors = saveState.fieldErrors ?? {};
  const latestMessage = resetState.message ?? saveState.message;
  const latestOk = resetState.message ? resetState.ok : saveState.ok;
  const effectiveUpdatedAt =
    resetState.updatedAt ?? saveState.updatedAt ?? updatedAt;
  const isPending = savePending || resetPending;

  const canSave = !isPending;

  function updateConfig(patch: Partial<FooterConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "bg-cyan-500/20 text-cyan-200"
                : "bg-white/5 text-zinc-400 hover:text-zinc-200"
            }`}
            key={t.id}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>

      {latestMessage ? (
        <p
          className={`text-sm ${latestOk ? "text-emerald-400" : "text-rose-400"}`}
          role="status"
        >
          {latestMessage}
        </p>
      ) : null}

      {effectiveUpdatedAt ? (
        <p className="text-xs text-zinc-500">
          Cập nhật lần cuối: {new Date(effectiveUpdatedAt).toLocaleString("vi-VN")}
        </p>
      ) : null}

      <form action={saveAction} className="space-y-4">
        <input name="configPayload" type="hidden" value={payload} />

        {tab === "general" ? (
          <Card className="space-y-4 p-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                type="checkbox"
              />
              Hiển thị footer
            </label>
            <Input
              label="Tên thương hiệu"
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  brand: { ...c.brand, name: e.target.value }
                }))
              }
              value={config.brand.name}
            />
            <Textarea
              label="Mô tả thương hiệu"
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  brand: { ...c.brand, description: e.target.value }
                }))
              }
              rows={3}
              value={config.brand.description}
            />
            <Input
              label="Logo media ID (UUID, tùy chọn)"
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  brand: {
                    ...c.brand,
                    logoMediaId: e.target.value.trim() || null
                  }
                }))
              }
              value={config.brand.logoMediaId ?? ""}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-200">Bản quyền</p>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    copyright: {
                      ...c.copyright,
                      mode: e.target.value as FooterConfig["copyright"]["mode"]
                    }
                  }))
                }
                value={config.copyright.mode}
              >
                <option value="auto_year">Tự động năm ({`{year}`})</option>
                <option value="custom">Tuỳ chỉnh</option>
              </select>
              <Textarea
                label="Nội dung copyright"
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    copyright: { ...c.copyright, text: e.target.value }
                  }))
                }
                rows={2}
                value={config.copyright.text}
              />
            </div>
          </Card>
        ) : null}

        {tab === "columns" ? (
          <ColumnsEditor
            columns={config.columns}
            onChange={(columns) => updateConfig({ columns })}
          />
        ) : null}

        {tab === "legal" ? (
          <LegalLinksEditor
            links={config.legalLinks}
            onChange={(legalLinks) => updateConfig({ legalLinks })}
          />
        ) : null}

        {tab === "compliance" ? (
          <ComplianceEditor
            compliance={config.compliance}
            fieldErrors={fieldErrors}
            onChange={(compliance) => updateConfig({ compliance })}
          />
        ) : null}

        {tab === "contact" ? (
          <Card className="space-y-3 p-4">
            <p className="text-sm text-zinc-400">
              Liên hệ chính thức của ChapMee (không phải tác giả).
            </p>
            {(
              [
                ["operatorName", "Tên đơn vị vận hành"],
                ["taxCode", "Mã số thuế"],
                ["address", "Địa chỉ"],
                ["supportEmail", "Email hỗ trợ"],
                ["privacyEmail", "Email quyền riêng tư"],
                ["copyrightEmail", "Email bản quyền"],
                ["businessEmail", "Email kinh doanh"]
              ] as const
            ).map(([key, label]) => (
              <Input
                key={key}
                label={label}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    officialContact: {
                      ...c.officialContact,
                      [key]: e.target.value
                    }
                  }))
                }
                value={config.officialContact[key]}
              />
            ))}
          </Card>
        ) : null}

        {tab === "preview" ? <FooterPreview config={config} /> : null}

        <div className="flex flex-wrap gap-2">
          <Button disabled={!canSave || !isDirty} type="submit">
            {savePending ? "Đang lưu…" : "Lưu cài đặt"}
          </Button>
        </div>
      </form>

      <form action={resetAction}>
        <Button disabled={isPending} type="submit" variant="secondary">
          {resetPending ? "Đang khôi phục…" : "Khôi phục mặc định"}
        </Button>
      </form>
    </div>
  );
}

function ColumnsEditor({
  columns,
  onChange
}: {
  columns: FooterColumn[];
  onChange: (columns: FooterColumn[]) => void;
}) {
  function addColumn() {
    onChange([
      ...columns,
      {
        title: "Cột mới",
        enabled: true,
        sortOrder: columns.length,
        links: []
      }
    ]);
  }

  return (
    <Card className="space-y-4 p-4">
      <Button onClick={addColumn} type="button" variant="secondary">
        Thêm cột
      </Button>
      {columns.map((column, colIndex) => (
        <div
          className="space-y-2 rounded-xl border border-white/10 p-3"
          key={`col-${colIndex}`}
        >
          <div className="flex flex-wrap gap-2">
            <Input
              className="flex-1"
              label="Tiêu đề cột"
              onChange={(e) => {
                const next = [...columns];
                next[colIndex] = { ...column, title: e.target.value };
                onChange(next);
              }}
              value={column.title}
            />
            <label className="flex items-end gap-2 pb-2 text-sm">
              <input
                checked={column.enabled}
                onChange={(e) => {
                  const next = [...columns];
                  next[colIndex] = { ...column, enabled: e.target.checked };
                  onChange(next);
                }}
                type="checkbox"
              />
              Bật
            </label>
          </div>
          {column.links.map((link, linkIndex) => (
            <div
              className="grid gap-2 sm:grid-cols-2"
              key={`link-${colIndex}-${linkIndex}`}
            >
              <Input
                label="Nhãn"
                onChange={(e) => {
                  const next = [...columns];
                  const links = [...column.links];
                  links[linkIndex] = { ...link, label: e.target.value };
                  next[colIndex] = { ...column, links };
                  onChange(next);
                }}
                value={link.label}
              />
              <Input
                label="Href"
                onChange={(e) => {
                  const next = [...columns];
                  const links = [...column.links];
                  links[linkIndex] = { ...link, href: e.target.value };
                  next[colIndex] = { ...column, links };
                  onChange(next);
                }}
                value={link.href}
              />
            </div>
          ))}
          <Button
            onClick={() => {
              const next = [...columns];
              next[colIndex] = {
                ...column,
                links: [
                  ...column.links,
                  {
                    label: "Liên kết",
                    href: "/",
                    external: false,
                    enabled: true,
                    sortOrder: column.links.length
                  }
                ]
              };
              onChange(next);
            }}
            type="button"
            variant="secondary"
          >
            Thêm liên kết
          </Button>
        </div>
      ))}
    </Card>
  );
}

function LegalLinksEditor({
  links,
  onChange
}: {
  links: FooterLegalLink[];
  onChange: (links: FooterLegalLink[]) => void;
}) {
  return (
    <Card className="space-y-3 p-4">
      {links.map((link, index) => (
        <div
          className="grid gap-2 rounded-xl border border-white/10 p-3 sm:grid-cols-2"
          key={`legal-${index}`}
        >
          <Input
            label="Nhãn"
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, label: e.target.value };
              onChange(next);
            }}
            value={link.label}
          />
          <Input
            label="Href"
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, href: e.target.value };
              onChange(next);
            }}
            value={link.href}
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              checked={link.enabled}
              onChange={(e) => {
                const next = [...links];
                next[index] = { ...link, enabled: e.target.checked };
                onChange(next);
              }}
              type="checkbox"
            />
            Hiển thị
          </label>
        </div>
      ))}
      <Button
        onClick={() =>
          onChange([
            ...links,
            {
              label: "Liên kết mới",
              href: "/legal/",
              enabled: true,
              sortOrder: links.length
            }
          ])
        }
        type="button"
        variant="secondary"
      >
        Thêm liên kết pháp lý
      </Button>
    </Card>
  );
}

function ComplianceEditor({
  compliance,
  onChange,
  fieldErrors
}: {
  compliance: FooterConfig["compliance"];
  onChange: (compliance: FooterConfig["compliance"]) => void;
  fieldErrors: Record<string, string>;
}) {
  const dmca = compliance.dmca;
  const bo = compliance.boCongThuong;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <p className="font-medium text-zinc-200">DMCA</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={dmca.enabled}
            onChange={(e) =>
              onChange({
                ...compliance,
                dmca: { ...dmca, enabled: e.target.checked }
              })
            }
            type="checkbox"
          />
          Bật DMCA (mặc định tắt)
        </label>
        <select
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
          onChange={(e) =>
            onChange({
              ...compliance,
              dmca: {
                ...dmca,
                mode: e.target.value as typeof dmca.mode
              }
            })
          }
          value={dmca.mode}
        >
          <option value="link">Link</option>
          <option value="image">Ảnh</option>
          <option value="embed">Embed HTML (chưa hiển thị an toàn)</option>
        </select>
        {dmca.mode === "embed" ? (
          <p className="text-xs text-amber-400/90">
            TODO: embedHtml cần sanitizer trước khi render trên frontend. Hiện chỉ
            hỗ trợ image/link.
          </p>
        ) : null}
        <Input
          label="URL ảnh"
          onChange={(e) =>
            onChange({ ...compliance, dmca: { ...dmca, imageUrl: e.target.value } })
          }
          value={dmca.imageUrl}
        />
        <Input
          label="URL liên kết"
          onChange={(e) =>
            onChange({ ...compliance, dmca: { ...dmca, linkUrl: e.target.value } })
          }
          value={dmca.linkUrl}
        />
        {fieldErrors["compliance.dmca.imageUrl"] ? (
          <p className="text-xs text-rose-400">{fieldErrors["compliance.dmca.imageUrl"]}</p>
        ) : null}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="font-medium text-zinc-200">Bộ Công Thương</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            checked={bo.enabled}
            onChange={(e) =>
              onChange({
                ...compliance,
                boCongThuong: { ...bo, enabled: e.target.checked }
              })
            }
            type="checkbox"
          />
          Bật badge (cần ảnh hoặc URL xác minh)
        </label>
        <select
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
          onChange={(e) =>
            onChange({
              ...compliance,
              boCongThuong: {
                ...bo,
                status: e.target.value as typeof bo.status
              }
            })
          }
          value={bo.status}
        >
          <option value="not_started">Chưa bắt đầu</option>
          <option value="preparing">Đang chuẩn bị</option>
          <option value="notified">Đã thông báo</option>
          <option value="registered">Đã đăng ký</option>
        </select>
        <p className="text-xs text-zinc-500">
          Trạng thái chỉ dùng nội bộ admin; frontend chỉ hiển thị ảnh badge khi bật
          và có URL ảnh.
        </p>
        <Input
          label="URL ảnh badge"
          onChange={(e) =>
            onChange({
              ...compliance,
              boCongThuong: { ...bo, badgeImageUrl: e.target.value }
            })
          }
          value={bo.badgeImageUrl}
        />
        <Input
          label="URL xác minh"
          onChange={(e) =>
            onChange({
              ...compliance,
              boCongThuong: { ...bo, verificationUrl: e.target.value }
            })
          }
          value={bo.verificationUrl}
        />
      </Card>

      <CustomBadgesEditor
        badges={compliance.customBadges}
        onChange={(customBadges) => onChange({ ...compliance, customBadges })}
      />
    </div>
  );
}

function CustomBadgesEditor({
  badges,
  onChange
}: {
  badges: FooterCustomBadge[];
  onChange: (badges: FooterCustomBadge[]) => void;
}) {
  return (
    <Card className="space-y-3 p-4">
      <p className="font-medium text-zinc-200">Badge tùy chỉnh</p>
      {badges.map((badge, index) => (
        <div
          className="space-y-2 rounded-xl border border-white/10 p-3"
          key={`badge-${index}`}
        >
          <Input
            label="Nhãn"
            onChange={(e) => {
              const next = [...badges];
              next[index] = { ...badge, label: e.target.value };
              onChange(next);
            }}
            value={badge.label}
          />
          <Input
            label="URL ảnh"
            onChange={(e) => {
              const next = [...badges];
              next[index] = { ...badge, imageUrl: e.target.value };
              onChange(next);
            }}
            value={badge.imageUrl}
          />
          <Input
            label="Href (tùy chọn)"
            onChange={(e) => {
              const next = [...badges];
              next[index] = { ...badge, href: e.target.value };
              onChange(next);
            }}
            value={badge.href}
          />
        </div>
      ))}
      <Button
        onClick={() =>
          onChange([
            ...badges,
            {
              label: "Badge",
              imageUrl: "",
              href: "",
              enabled: true,
              sortOrder: badges.length
            }
          ])
        }
        type="button"
        variant="secondary"
      >
        Thêm badge
      </Button>
    </Card>
  );
}
