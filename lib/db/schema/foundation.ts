import { boolean, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Legacy profiles columns — full schema comes from db/migrations/legacy. */
export const profilesFoundation = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  authUserId: uuid("auth_user_id"),
  username: text("username").unique(),
  displayName: text("display_name"),
  avatarMediaId: uuid("avatar_media_id"),
  defaultAvatarId: integer("default_avatar_id"),
  isAdmin: boolean("is_admin"),
  isCreator: boolean("is_creator"),
  isReader: boolean("is_reader"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
});
