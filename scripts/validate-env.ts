/**

 * Validate a ChapMee env file (no secret values printed).

 *

 *   npx tsx scripts/validate-env.ts --file .env.production.example

 *   npx tsx scripts/validate-env.ts --file .env.production --production

 *   npm run env:validate -- --file .env.production.example

 */

import { readFileSync } from "fs";

import { resolve } from "path";



const SECRET_LIKE = /SECRET|PASSWORD|KEY|TOKEN|ENCRYPTION/i;

const LOCALHOST = /localhost|127\.0\.0\.1/i;



/** Keys allowed to use loopback in --production (VPS host services, not browser-facing). */

const PRODUCTION_LOCALHOST_ALLOWLIST = new Set([

  "SMTP_HOST",

  "SMTP_PORT",

  "SMTP_SECURE",

  "SMTP_USER",

  "SMTP_PASS",

  "SMTP_TLS_REJECT_UNAUTHORIZED"

]);



const EXPECTED_S3_ENDPOINT = "https://s3.vn-hcm-1.vietnix.cloud";

const EXPECTED_S3_MEDIA_PUBLIC_BASE = "https://media.chapmee.com";



const REQUIRED_PRODUCTION = [

  "NEXT_PUBLIC_APP_URL",

  "APP_URL",

  "NEXT_PUBLIC_SITE_URL",

  "NEXT_PUBLIC_APP_NAME",

  "DATABASE_URL",

  "POSTGRES_DB",

  "POSTGRES_USER",

  "POSTGRES_PASSWORD",

  "POSTGREST_URL",

  "NEXT_PUBLIC_POSTGREST_URL",

  "POSTGREST_JWT_SECRET",

  "BETTER_AUTH_SECRET",

  "BETTER_AUTH_URL",

  "REDIS_URL",

  "S3_ENDPOINT",

  "S3_REGION",

  "S3_MEDIA_BUCKET",

  "S3_TEXT_BUCKET",

  "S3_ACCESS_KEY_ID",

  "S3_SECRET_ACCESS_KEY",

  "S3_FORCE_PATH_STYLE",

  "S3_MEDIA_PUBLIC_BASE_URL",

  "NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL",

  "ENCRYPTION_KEY",

  "CRON_SECRET"

] as const;



function parseArgs() {

  const args = process.argv.slice(2);

  let file = ".env.production.example";

  let production = false;

  for (let i = 0; i < args.length; i++) {

    if (args[i] === "--file" && args[i + 1]) {

      file = args[++i];

    } else if (args[i] === "--production") {

      production = true;

    }

  }

  if (file.includes("production") && !file.includes("example")) {

    production = true;

  }

  return { file: resolve(process.cwd(), file), production };

}



function parseEnvFile(path: string): Map<string, string> {

  const text = readFileSync(path, "utf8");

  const map = new Map<string, string>();

  for (const line of text.split(/\r?\n/)) {

    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");

    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();

    let value = trimmed.slice(eq + 1).trim();

    if (

      (value.startsWith('"') && value.endsWith('"')) ||

      (value.startsWith("'") && value.endsWith("'"))

    ) {

      value = value.slice(1, -1);

    }

    map.set(key, value);

  }

  return map;

}



function warn(msg: string) {

  console.warn(`WARN: ${msg}`);

}



function error(msg: string) {

  console.error(`ERROR: ${msg}`);

}



function main() {

  const { file, production } = parseArgs();

  const env = parseEnvFile(file);

  let errors = 0;

  let warnings = 0;



  console.log(`Validating: ${file}`);

  console.log(`Mode: ${production ? "production" : "template/check"}`);



  for (const key of REQUIRED_PRODUCTION) {

    const value = env.get(key)?.trim();

    if (!value) {

      error(`Missing required: ${key}`);

      errors++;

    }

  }



  for (const [key, value] of env) {

    if (!value) continue;



    if (value.includes("CHANGE_ME")) {

      warn(`${key} still uses CHANGE_ME placeholder`);

      warnings++;

    }



    if (production && LOCALHOST.test(value) && !PRODUCTION_LOCALHOST_ALLOWLIST.has(key)) {

      warn(`${key} contains localhost/127.0.0.1 in production mode`);

      warnings++;

    }



    if (key.startsWith("NEXT_PUBLIC_") && SECRET_LIKE.test(key)) {

      error(`${key} looks like a secret in NEXT_PUBLIC_* — must not be public`);

      errors++;

    }

  }



  const s3MediaPublic = env.get("S3_MEDIA_PUBLIC_BASE_URL")?.replace(/\/$/, "") ?? "";

  const s3MediaPublicClient = env.get("NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL")?.replace(/\/$/, "") ?? "";



  if (s3MediaPublic && s3MediaPublic !== EXPECTED_S3_MEDIA_PUBLIC_BASE) {

    warn(

      `S3_MEDIA_PUBLIC_BASE_URL expected ${EXPECTED_S3_MEDIA_PUBLIC_BASE} (got: ${s3MediaPublic.slice(0, 60)}${s3MediaPublic.length > 60 ? "…" : ""})`

    );

    warnings++;

  }



  if (s3MediaPublicClient && s3MediaPublicClient !== EXPECTED_S3_MEDIA_PUBLIC_BASE) {

    warn(

      `NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL expected ${EXPECTED_S3_MEDIA_PUBLIC_BASE} (got: ${s3MediaPublicClient.slice(0, 60)}…)`

    );

    warnings++;

  }



  if (s3MediaPublic && s3MediaPublicClient && s3MediaPublic !== s3MediaPublicClient) {

    warn("S3_MEDIA_PUBLIC_BASE_URL and NEXT_PUBLIC_S3_MEDIA_PUBLIC_BASE_URL should match");

    warnings++;

  }



  if (production) {

    const s3Endpoint = env.get("S3_ENDPOINT") ?? "";

    if (s3Endpoint && s3Endpoint !== EXPECTED_S3_ENDPOINT) {

      warn(`S3_ENDPOINT expected ${EXPECTED_S3_ENDPOINT} for Docker+MinIO VPS (got: ${s3Endpoint})`);

      warnings++;

    }



    const postgrestPublic = env.get("NEXT_PUBLIC_POSTGREST_URL") ?? "";

    if (postgrestPublic.includes("postgrest:") || LOCALHOST.test(postgrestPublic)) {

      warn("NEXT_PUBLIC_POSTGREST_URL must be a public HTTPS URL, not internal Docker host");

      warnings++;

    }



    const postgrestServer = env.get("POSTGREST_URL") ?? "";

    if (postgrestServer && LOCALHOST.test(postgrestServer)) {

      warn("POSTGREST_URL should use Docker service host postgrest:3000, not loopback");

      warnings++;

    }

  }



  const appUrl = env.get("NEXT_PUBLIC_APP_URL") ?? "";

  const siteUrl = env.get("NEXT_PUBLIC_SITE_URL") ?? "";

  const authUrl = env.get("BETTER_AUTH_URL") ?? "";

  if (appUrl && siteUrl && appUrl !== siteUrl) {

    warn("NEXT_PUBLIC_APP_URL and NEXT_PUBLIC_SITE_URL differ — intentional?");

    warnings++;

  }

  if (production && appUrl && authUrl && appUrl !== authUrl) {

    warn("BETTER_AUTH_URL should match NEXT_PUBLIC_APP_URL in production");

    warnings++;

  }



  if (!env.get("CHAPTER_CONTENT_CACHE_TTL_MS")?.trim()) {

    warn("CHAPTER_CONTENT_CACHE_TTL_MS unset — default 900000 ms applies");

    warnings++;

  }



  console.log(`\nDone: ${errors} error(s), ${warnings} warning(s)`);

  if (errors > 0) {

    process.exit(1);

  }

}



main();


