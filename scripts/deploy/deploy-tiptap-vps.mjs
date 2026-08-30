/**
 * Deploy ChapMee to VPS: pack local source, upload via SFTP, docker rebuild.
 * Usage: $env:VPS_PASSWORD='...'; node scripts/deploy/deploy-tiptap-vps.mjs
 */
import { Client } from "ssh2";
import { execSync } from "node:child_process";
import { createReadStream, unlinkSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const ARCHIVE = join(ROOT, ".deploy-pack.tar.gz");
const APP_DIR = "/opt/chapmee/app";

const VPS = {
  host: "14.225.211.205",
  port: 22,
  username: "deploy",
  password: process.env.VPS_PASSWORD
};

if (!VPS.password) {
  console.error("Set VPS_PASSWORD environment variable.");
  process.exit(1);
}

function execRemote(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Exit ${code}: ${stderr || stdout}`));
            return;
          }
          resolve(stdout);
        })
        .on("data", (data) => {
          stdout += data.toString();
          process.stdout.write(data);
        })
        .stderr.on("data", (data) => {
          stderr += data.toString();
          process.stderr.write(data);
        });
    });
  });
}

function uploadFile(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) {
        reject(err);
        return;
      }
      const readStream = createReadStream(localPath);
      const writeStream = sftp.createWriteStream(remotePath);
      writeStream.on("close", () => resolve());
      writeStream.on("error", reject);
      readStream.on("error", reject);
      readStream.pipe(writeStream);
    });
  });
}

console.log("Packing source...");
if (existsSync(ARCHIVE)) {
  unlinkSync(ARCHIVE);
}

const excludes = [
  "node_modules",
  ".next",
  ".git",
  ".env",
  ".env.local",
  ".env.production",
  ".deploy-pack.tar.gz",
  "ChapMee VPS",
  ".codex-screenshots",
  ".cursor"
];

const tarArgs = ["-czf", ARCHIVE, ...excludes.flatMap((item) => ["--exclude", item]), "-C", ROOT, "."];

execSync(`tar ${tarArgs.map((a) => (a.includes(" ") ? `"${a}"` : a)).join(" ")}`, {
  stdio: "inherit",
  shell: true
});

console.log(`Archive ready: ${ARCHIVE}\n`);

const conn = new Client();

conn
  .on("ready", async () => {
    console.log("SSH connected.\n");
    try {
      console.log("--- Upload archive ---\n");
      await uploadFile(conn, ARCHIVE, "/tmp/chapmee-deploy.tar.gz");

      console.log("\n--- Extract on VPS (preserve .env.production) ---\n");
      await execRemote(
        conn,
        `
set -e
ENV_BACKUP="/tmp/chapmee-env.production.bak"
if [ -f "${APP_DIR}/.env.production" ]; then
  cp "${APP_DIR}/.env.production" "$ENV_BACKUP"
fi
mkdir -p "${APP_DIR}"
tar -xzf /tmp/chapmee-deploy.tar.gz -C "${APP_DIR}"
if [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "${APP_DIR}/.env.production"
fi
rm -f /tmp/chapmee-deploy.tar.gz
echo "Extracted to ${APP_DIR}"
`
      );

      console.log("\n--- Building web container ---\n");
      await execRemote(
        conn,
        `cd ${APP_DIR} && docker compose -f docker-compose.production.yml --env-file .env.production build web`
      );

      console.log("\n--- Restarting stack ---\n");
      await execRemote(
        conn,
        `cd ${APP_DIR} && docker compose -f docker-compose.production.yml --env-file .env.production up -d`
      );

      console.log("\n--- Verify ---\n");
      await execRemote(
        conn,
        `cd ${APP_DIR} && sleep 12 && docker compose -f docker-compose.production.yml ps`
      );

      console.log("\nDeploy complete.");
    } catch (error) {
      console.error("\nDeploy failed:", error.message);
      process.exitCode = 1;
    } finally {
      conn.end();
      if (existsSync(ARCHIVE)) {
        unlinkSync(ARCHIVE);
      }
    }
  })
  .on("error", (err) => {
    console.error("SSH error:", err.message);
    process.exit(1);
  })
  .connect(VPS);
