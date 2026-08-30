import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const emailJobs = pgTable(
  "email_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    status: text("status").notNull().default("pending"),
    provider: text("provider"),
    providerMessageId: text("provider_message_id"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    errorMessage: text("error_message"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("email_jobs_status_scheduled_idx").on(table.status, table.scheduledAt)
  ]
);
