"use client";

import { useState, useTransition } from "react";
import { Button, Card, ErrorState } from "@/components/ui";
import {
  saveAnnouncementAction,
  saveContentPostAction,
  saveNotificationCampaignAction,
  saveSeoRuleAction,
  sendNotificationCampaignAction
} from "@/lib/admin/platform-content-actions";
import { CONTENT_HUB_TABS } from "@/lib/platform-content/constants";
import type { ContentHubAdminCapabilities } from "@/types/admin-platform-content";
import type { ContentHubTabId } from "@/types/admin-platform-content";
import type {
  AdminContentPost,
  NotificationCampaign,
  PlatformAnnouncement,
  SeoAuditLog,
  SeoRule
} from "@/types/platform-content";

type Props = {
  posts: AdminContentPost[];
  announcements: PlatformAnnouncement[];
  campaigns: NotificationCampaign[];
  seoRules: SeoRule[];
  seoAuditLogs: SeoAuditLog[];
  capabilities: ContentHubAdminCapabilities;
  loadError?: string | null;
  showPostsTab?: boolean;
};

export function ContentHubCenter({
  posts,
  announcements,
  campaigns,
  seoRules,
  seoAuditLogs,
  capabilities,
  loadError,
  showPostsTab = true
}: Props) {
  const availableTabs = CONTENT_HUB_TABS.filter(
    (item) => showPostsTab || item.id !== "posts"
  );
  const [tab, setTab] = useState<ContentHubTabId>(availableTabs[0]?.id ?? "campaigns");
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4000);
  };

  if (loadError) {
    return <ErrorState message={loadError} title="Không thể tải Content Hub" variant="danger" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Content Hub</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý bài viết nền tảng, thông báo, notification campaigns và SEO rules — tách biệt từng
          loại nội dung.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {availableTabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? "primary" : "secondary"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </nav>

      {toast ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {toast}
        </div>
      ) : null}

      {tab === "posts" ? (
        <PostsTab
          capabilities={capabilities}
          pending={pending}
          posts={posts}
          onSave={(formData) => {
            startTransition(async () => {
              const result = await saveContentPostAction(formData);
              showToast(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
            });
          }}
        />
      ) : null}

      {tab === "announcements" ? (
        <AnnouncementsTab
          announcements={announcements}
          capabilities={capabilities}
          pending={pending}
          onSave={(formData) => {
            startTransition(async () => {
              const result = await saveAnnouncementAction(formData);
              showToast(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
            });
          }}
        />
      ) : null}

      {tab === "campaigns" ? (
        <CampaignsTab
          campaigns={campaigns}
          capabilities={capabilities}
          pending={pending}
          onSave={(formData) => {
            startTransition(async () => {
              const result = await saveNotificationCampaignAction(formData);
              showToast(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
            });
          }}
          onSend={(id) => {
            startTransition(async () => {
              const result = await sendNotificationCampaignAction(id);
              showToast(result.message ?? (result.ok ? "Đã gửi." : "Lỗi."));
            });
          }}
        />
      ) : null}

      {tab === "seo" ? (
        <SeoTab
          auditLogs={seoAuditLogs}
          capabilities={capabilities}
          pending={pending}
          rules={seoRules}
          onSave={(formData) => {
            startTransition(async () => {
              const result = await saveSeoRuleAction(formData);
              showToast(result.message ?? (result.ok ? "Đã lưu." : "Lỗi."));
            });
          }}
        />
      ) : null}
    </div>
  );
}

function PostsTab({
  posts,
  capabilities,
  pending,
  onSave
}: {
  posts: AdminContentPost[];
  capabilities: ContentHubAdminCapabilities;
  pending: boolean;
  onSave: (input: Parameters<typeof saveContentPostAction>[0]) => void;
}) {
  const [editing, setEditing] = useState<AdminContentPost | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-medium">Danh sách bài viết</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có bài viết.</p>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{post.title}</div>
                  <div className="text-xs text-muted-foreground">
                    /bai-viet/{post.slug} · {post.status} · {post.post_type}
                  </div>
                </div>
                {capabilities.canUpdatePosts ? (
                  <Button variant="secondary" onClick={() => setEditing(post)}>
                    Sửa
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {capabilities.canCreatePosts || capabilities.canUpdatePosts ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">
            {editing ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}
          </h2>
          <PostForm
            editing={editing}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSubmit={onSave}
          />
        </Card>
      ) : null}
    </div>
  );
}

function PostForm({
  editing,
  pending,
  onSubmit,
  onCancel
}: {
  editing: AdminContentPost | null;
  pending: boolean;
  onSubmit: (input: Parameters<typeof saveContentPostAction>[0]) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSubmit({
          id: editing?.id,
          title: String(form.get("title") ?? ""),
          slug: String(form.get("slug") ?? ""),
          excerpt: String(form.get("excerpt") ?? ""),
          content: String(form.get("content") ?? ""),
          category: String(form.get("category") ?? ""),
          tags: String(form.get("tags") ?? ""),
          post_type: String(form.get("post_type") ?? "article"),
          status: String(form.get("status") ?? "draft"),
          seo_title: String(form.get("seo_title") ?? ""),
          seo_description: String(form.get("seo_description") ?? ""),
          indexable: form.get("indexable") === "on"
        });
      }}
    >
      <Field name="title" label="Tiêu đề" defaultValue={editing?.title} required />
      <Field name="slug" label="Slug" defaultValue={editing?.slug} required />
      <Field name="excerpt" label="Tóm tắt" defaultValue={editing?.excerpt ?? ""} />
      <TextArea name="content" label="Nội dung" defaultValue={editing?.content ?? ""} />
      <Field name="category" label="Danh mục" defaultValue={editing?.category ?? ""} />
      <Field
        name="tags"
        label="Tags (phân cách bằng dấu phẩy)"
        defaultValue={editing?.tags.join(", ") ?? ""}
      />
      <SelectField
        name="post_type"
        label="Loại bài"
        defaultValue={editing?.post_type ?? "article"}
        options={["article", "guide", "seo", "editorial", "policy", "news"]}
      />
      <SelectField
        name="status"
        label="Trạng thái"
        defaultValue={editing?.status ?? "draft"}
        options={["draft", "published", "hidden", "archived"]}
      />
      <Field name="seo_title" label="SEO title" defaultValue={editing?.seo_title ?? ""} />
      <Field
        name="seo_description"
        label="SEO description"
        defaultValue={editing?.seo_description ?? ""}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          defaultChecked={editing?.indexable ?? true}
          name="indexable"
          type="checkbox"
        />
        Cho phép index (public)
      </label>
      <div className="flex gap-2">
        <Button disabled={pending} type="submit">
          {pending ? "Đang lưu…" : "Lưu bài viết"}
        </Button>
        {editing ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Hủy
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function AnnouncementsTab({
  announcements,
  capabilities,
  pending,
  onSave
}: {
  announcements: PlatformAnnouncement[];
  capabilities: ContentHubAdminCapabilities;
  pending: boolean;
  onSave: (input: Parameters<typeof saveAnnouncementAction>[0]) => void;
}) {
  const [editing, setEditing] = useState<PlatformAnnouncement | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-medium">Thông báo nền tảng</h2>
        <ul className="divide-y divide-border">
          {announcements.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  /thong-bao/{item.slug} · {item.status} · index:{" "}
                  {item.indexable ? "yes" : "no"}
                </div>
              </div>
              {capabilities.canUpdateAnnouncements ? (
                <Button variant="secondary" onClick={() => setEditing(item)}>
                  Sửa
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {capabilities.canCreateAnnouncements || capabilities.canUpdateAnnouncements ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">
            {editing ? "Chỉnh sửa thông báo" : "Tạo thông báo"}
          </h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSave({
                id: editing?.id,
                title: String(form.get("title") ?? ""),
                slug: String(form.get("slug") ?? ""),
                body: String(form.get("body") ?? ""),
                announcement_type: String(form.get("announcement_type") ?? "general"),
                visibility: String(form.get("visibility") ?? "public"),
                status: String(form.get("status") ?? "draft"),
                priority: String(form.get("priority") ?? "normal"),
                indexable: form.get("indexable") === "on"
              });
            }}
          >
            <Field name="title" label="Tiêu đề" defaultValue={editing?.title} />
            <Field name="slug" label="Slug" defaultValue={editing?.slug} />
            <TextArea name="body" label="Nội dung" defaultValue={editing?.body ?? ""} />
            <SelectField
              name="announcement_type"
              label="Loại"
              defaultValue={editing?.announcement_type ?? "general"}
              options={[
                "general",
                "maintenance",
                "policy",
                "monetization",
                "creator",
                "reader",
                "feature",
                "warning"
              ]}
            />
            <SelectField
              name="visibility"
              label="Hiển thị"
              defaultValue={editing?.visibility ?? "public"}
              options={["public", "targeted", "admin_only"]}
            />
            <SelectField
              name="status"
              label="Trạng thái"
              defaultValue={editing?.status ?? "draft"}
              options={["draft", "published", "scheduled", "hidden", "archived"]}
            />
            <SelectField
              name="priority"
              label="Ưu tiên"
              defaultValue={editing?.priority ?? "normal"}
              options={["low", "normal", "high", "critical"]}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                defaultChecked={editing?.indexable ?? false}
                name="indexable"
                type="checkbox"
              />
              Cho phép index (mặc định noindex)
            </label>
            <Button disabled={pending} type="submit">
              Lưu thông báo
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function CampaignsTab({
  campaigns,
  capabilities,
  pending,
  onSave,
  onSend
}: {
  campaigns: NotificationCampaign[];
  capabilities: ContentHubAdminCapabilities;
  pending: boolean;
  onSave: (input: Parameters<typeof saveNotificationCampaignAction>[0]) => void;
  onSend: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-medium">Notification campaigns</h2>
        <ul className="divide-y divide-border">
          {campaigns.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-muted-foreground">
                  {item.status} · {item.target_mode} · est. {item.estimated_recipient_count}
                </div>
              </div>
              {capabilities.canUpdateCampaigns && item.status !== "sent" ? (
                <Button variant="secondary" onClick={() => onSend(item.id)}>
                  Gửi in-app
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      {capabilities.canCreateCampaigns ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">Tạo campaign</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSave({
                title: String(form.get("title") ?? ""),
                message: String(form.get("message") ?? ""),
                notification_type: String(form.get("notification_type") ?? "system"),
                target_mode: String(form.get("target_mode") ?? "segment"),
                target_segments: String(form.get("target_segments") ?? "all_users"),
                channel_in_app: form.get("channel_in_app") === "on",
                channel_email: form.get("channel_email") === "on",
                status: "draft"
              });
            }}
          >
            <Field name="title" label="Tiêu đề" />
            <TextArea name="message" label="Nội dung" />
            <SelectField
              name="notification_type"
              label="Loại"
              defaultValue="system"
              options={[
                "system",
                "policy",
                "monetization",
                "account",
                "story",
                "chapter",
                "event",
                "warning",
                "marketing"
              ]}
            />
            <SelectField
              name="target_mode"
              label="Target mode"
              defaultValue="segment"
              options={["all", "segment", "manual"]}
            />
            <Field
              name="target_segments"
              label="Segments (creators, readers, vip_users, staff, all_users)"
              defaultValue="all_users"
            />
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked name="channel_in_app" type="checkbox" />
              In-app
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input name="channel_email" type="checkbox" />
              Email (chưa cấu hình)
            </label>
            <Button disabled={pending} type="submit">
              Tạo campaign
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function SeoTab({
  rules,
  auditLogs,
  capabilities,
  pending,
  onSave
}: {
  rules: SeoRule[];
  auditLogs: SeoAuditLog[];
  capabilities: ContentHubAdminCapabilities;
  pending: boolean;
  onSave: (input: Parameters<typeof saveSeoRuleAction>[0]) => void;
}) {
  const [selected, setSelected] = useState<SeoRule | null>(rules[0] ?? null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card className="p-4">
        <h2 className="mb-4 text-lg font-medium">SEO rules</h2>
        <ul className="divide-y divide-border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{rule.route_pattern}</div>
                <div className="text-xs text-muted-foreground">
                  {rule.page_type} · index: {rule.indexable ? "yes" : "no"} · follow:{" "}
                  {rule.follow_links ? "yes" : "no"}
                </div>
              </div>
              {capabilities.canUpdateSeo ? (
                <Button variant="secondary" onClick={() => setSelected(rule)}>
                  Sửa
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {capabilities.canViewSeoAudit ? (
          <>
            <h2 className="mb-3 mt-8 text-lg font-medium">SEO audit logs</h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có log audit.</p>
            ) : (
              <ul className="divide-y divide-border">
                {auditLogs.slice(0, 10).map((log) => (
                  <li key={log.id} className="py-2 text-sm">
                    <span className="font-medium">{log.route}</span> — {log.message}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </Card>

      {capabilities.canUpdateSeo && selected ? (
        <Card className="p-4">
          <h2 className="mb-4 text-lg font-medium">Chỉnh rule: {selected.route_pattern}</h2>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              onSave({
                id: selected.id,
                indexable: form.get("indexable") === "on",
                follow_links: form.get("follow_links") === "on",
                title_template: String(form.get("title_template") ?? ""),
                description_template: String(form.get("description_template") ?? ""),
                canonical_mode: String(form.get("canonical_mode") ?? "self"),
                custom_canonical_url: String(form.get("custom_canonical_url") ?? ""),
                notes: String(form.get("notes") ?? "")
              });
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={selected.indexable} name="indexable" type="checkbox" />
              Indexable
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input defaultChecked={selected.follow_links} name="follow_links" type="checkbox" />
              Follow links
            </label>
            <Field
              name="title_template"
              label="Title template"
              defaultValue={selected.title_template ?? ""}
            />
            <Field
              name="description_template"
              label="Description template"
              defaultValue={selected.description_template ?? ""}
            />
            <SelectField
              name="canonical_mode"
              label="Canonical mode"
              defaultValue={selected.canonical_mode}
              options={["self", "custom", "none"]}
            />
            <Field
              name="custom_canonical_url"
              label="Custom canonical URL"
              defaultValue={selected.custom_canonical_url ?? ""}
            />
            <Field name="notes" label="Ghi chú" defaultValue={selected.notes ?? ""} />
            <Button disabled={pending} type="submit">
              Lưu rule
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        className="w-full rounded-md border border-input bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
        required={required}
      />
    </label>
  );
}

function TextArea({
  name,
  label,
  defaultValue
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: string[];
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
