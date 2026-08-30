import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { profilesFoundation } from "@/lib/db/schema/foundation";

export const codeSnippets = pgTable(
  "code_snippets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    type: varchar("type", { length: 32 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    code: text("code").notNull().default(""),
    priority: integer("priority").notNull().default(100),
    placementConfig: jsonb("placement_config").notNull().default({}),
    routePatterns: jsonb("route_patterns").notNull().default([]),
    surfaceKeys: jsonb("surface_keys").notNull().default([]),
    deviceTarget: varchar("device_target", { length: 16 }).notNull().default("all"),
    userTarget: varchar("user_target", { length: 16 }).notNull().default("all"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    notes: text("notes"),
    checksum: text("checksum"),
    lastValidationStatus: varchar("last_validation_status", { length: 16 }),
    lastValidationMessage: text("last_validation_message"),
    createdBy: uuid("created_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    updatedBy: uuid("updated_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp("archived_at", { withTimezone: true })
  },
  (table) => ({
    slugIdx: index("code_snippets_slug_idx").on(table.slug),
    statusIdx: index("code_snippets_status_idx").on(table.status),
    typeIdx: index("code_snippets_type_idx").on(table.type),
    priorityIdx: index("code_snippets_priority_idx").on(table.priority),
    updatedAtIdx: index("code_snippets_updated_at_idx").on(table.updatedAt)
  })
);

export const codeSnippetVersions = pgTable(
  "code_snippet_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snippetId: uuid("snippet_id")
      .notNull()
      .references(() => codeSnippets.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    code: text("code").notNull(),
    configSnapshot: jsonb("config_snapshot").notNull().default({}),
    changeNote: text("change_note"),
    createdBy: uuid("created_by").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    snippetVersionIdx: index("code_snippet_versions_snippet_version_idx").on(
      table.snippetId,
      table.versionNumber
    )
  })
);

export const codeSnippetAuditLogs = pgTable(
  "code_snippet_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snippetId: uuid("snippet_id").references(() => codeSnippets.id, {
      onDelete: "set null"
    }),
    action: varchar("action", { length: 64 }).notNull(),
    beforeSnapshot: jsonb("before_snapshot"),
    afterSnapshot: jsonb("after_snapshot"),
    actorId: uuid("actor_id").references(() => profilesFoundation.id, {
      onDelete: "set null"
    }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    snippetIdx: index("code_snippet_audit_logs_snippet_idx").on(table.snippetId),
    actionIdx: index("code_snippet_audit_logs_action_idx").on(table.action),
    createdAtIdx: index("code_snippet_audit_logs_created_at_idx").on(table.createdAt)
  })
);

export type CodeSnippetRow = typeof codeSnippets.$inferSelect;
export type CodeSnippetVersionRow = typeof codeSnippetVersions.$inferSelect;
