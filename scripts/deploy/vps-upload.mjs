/**
 * Pack local source, upload via SFTP, extract on VPS (preserve .env.production).
 * DEPRECATED for routine deploy: follow-up build runs on VPS (OOM on 4GB).
 * Use scripts/deploy/deploy-local-to-vps.ps1 — build Docker on local machine only.
 * See docs/VPS_BUILD_RUNBOOK.md
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
    console.log("SSH connected.\n--- Upload archive ---");
    try {
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
      console.log("\nUpload complete.");
    } catch (error) {
      console.error("\nUpload failed:", error.message);
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
