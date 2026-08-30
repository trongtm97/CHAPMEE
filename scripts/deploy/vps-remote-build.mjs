/**
 * Run docker build on VPS in background and poll until done.
 */
import { Client } from "ssh2";

const APP_DIR = "/opt/chapmee/app";
const conn = new Client();

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let out = "";
      stream
        .on("close", (code) => {
          if (code !== 0) {
            reject(new Error(`Exit ${code}: ${out}`));
            return;
          }
          resolve(out);
        })
        .on("data", (d) => {
          out += d.toString();
          process.stdout.write(d);
        })
        .stderr.on("data", (d) => process.stderr.write(d));
    });
  });
}

conn
  .on("ready", async () => {
    try {
      console.log("Starting background docker build on VPS...\n");
      await exec(
        conn,
        `cd ${APP_DIR} && nohup docker compose -f docker-compose.production.yml --env-file .env.production build web > /tmp/chapmee-build.log 2>&1 & echo $!`
      );

      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 30000));
        const status = await new Promise((resolve, reject) => {
          conn.exec(
            "tail -3 /tmp/chapmee-build.log 2>/dev/null; pgrep -f 'docker compose.*build' >/dev/null && echo BUILDING || echo DONE",
            (err, stream) => {
              let out = "";
              stream.on("data", (d) => (out += d.toString()));
              stream.on("close", () => resolve(out));
            }
          );
        });
        process.stdout.write(`\n[${i + 1}/120] ${status.trim()}\n`);
        if (status.includes("DONE") && !status.includes("BUILDING")) {
          break;
        }
      }

      console.log("\n--- Build log tail ---\n");
      await exec(conn, "tail -30 /tmp/chapmee-build.log");

      console.log("\n--- Restarting stack ---\n");
      await exec(
        conn,
        `cd ${APP_DIR} && docker compose -f docker-compose.production.yml --env-file .env.production up -d`
      );

      console.log("\n--- Status ---\n");
      await exec(
        conn,
        `cd ${APP_DIR} && docker compose -f docker-compose.production.yml --env-file .env.production ps`
      );

      console.log("\nVPS deploy finished.");
    } catch (error) {
      console.error("Failed:", error.message);
      process.exitCode = 1;
    } finally {
      conn.end();
    }
  })
  .connect({
    host: "14.225.211.205",
    port: 22,
    username: "deploy",
    password: process.env.VPS_PASSWORD
  });
