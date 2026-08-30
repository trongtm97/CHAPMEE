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
      stream.on("data", (d) => process.stdout.write(d));
      stream.stderr.on("data", (d) => process.stderr.write(d));
      stream.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`Exit ${code}`));
          return;
        }
        resolve();
      });
    });
  });
}

conn
  .on("ready", async () => {
    try {
      await exec(
        conn,
        `cd ${APP_DIR} && docker compose -f docker-compose.production.yml --env-file .env.production up -d web && sleep 15 && docker compose -f docker-compose.production.yml --env-file .env.production ps && docker compose -f docker-compose.production.yml --env-file .env.production logs --tail=10 web`
      );
      console.log("\nRestart complete.");
    } catch (e) {
      console.error(e.message);
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
