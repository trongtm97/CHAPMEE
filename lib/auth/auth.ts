import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { isNextBuildPhase } from "@/lib/build/is-build-time";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { sendPasswordResetEmail } from "@/lib/auth/send-password-reset-email";
import { syncAuthUserShim } from "@/lib/auth/sync-auth-user-shim";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema/auth";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

const authSecret =
  process.env.BETTER_AUTH_SECRET ??
  process.env.AUTH_SECRET ??
  (isNextBuildPhase()
    ? "docker-build-placeholder-secret-not-used-at-runtime-min-32"
    : undefined);

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const trustedOrigins = Array.from(
  new Set(
    [
      process.env.BETTER_AUTH_URL,
      process.env.APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SITE_URL
    ].filter((value): value is string => Boolean(value))
  )
);

export const auth = betterAuth({
  baseURL,
  secret: authSecret,
  trustedOrigins,
  session: {
    expiresIn: SESSION_TTL_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    },
    useSecureCookies: process.env.NODE_ENV === "production"
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    autoSignIn: true,
    sendResetPassword: async ({ user, url }) => {
      void sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
        displayName: user.name
      });
    }
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          scope: ["openid", "email", "profile"],
          prompt: "select_account",
          accessType: "online"
        }
      }
    : {},
  account: {
    updateAccountOnSignIn: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false
    }
  },
  plugins: [nextCookies()],
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          if (!createdUser?.id || !createdUser.email) {
            return;
          }

          await syncAuthUserShim({
            id: createdUser.id,
            email: createdUser.email
          });

          await ensureProfileForUser({
            userId: createdUser.id,
            email: createdUser.email,
            displayName: createdUser.name
          });
        }
      }
    }
  },
  user: {
    modelName: "user",
    fields: {
      name: "name",
      email: "email",
      image: "image"
    }
  }
});
