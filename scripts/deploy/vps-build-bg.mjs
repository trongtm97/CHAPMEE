/**
 * Trigger a detached (nohup) build+restart on the VPS so it survives SSH drops.
 * Writes progress to /tmp/chapmee-build.log on the VPS.
 */
import { Client } from "ssh2";

const APP_DIR = "/opt/chapmee/app";
const conn = new Client();

const trigger = `
cat > /tmp/chapmee-build.sh <<'EOS'
#!/bin/sh
cd ${APP_DIR}
echo "=== BUILD START $(date) ==="
docker compose -f docker-compose.production.yml --env-file .env.production build web
BC=$?
echo "BUILD_DONE=$BC"
if [ "$BC" = "0" ]; then
  docker compose -f docker-compose.production.yml --env-file .env.production up -d
  echo "UP_DONE=$?"
fi
echo "=== ALL_DONE $(date) ==="
EOS
chmod +x /tmp/chapmee-build.sh
rm -f /tmp/chapmee-build.log
setsid sh -c 'nohup /tmp/chapmee-build.sh > /tmp/chapmee-build.log 2>&1 &' < /dev/null > /dev/null 2>&1
sleep 1
echo "TRIGGERED"
`;

conn
  .on("ready", () => {
    conn.exec(trigger, (err, stream) => {
      if (err) {
        console.error(err.message);
        conn.end();
        return;
      }
      stream
        .on("close", () => conn.end())
        .on("data", (d) => process.stdout.write(d.toString()))
        .stderr.on("data", (d) => process.stderr.write(d.toString()));
    });
  })
  .on("error", (e) => {
    console.error("SSH error:", e.message);
    process.exit(1);
  })
  .connect({
    host: "14.225.211.205",
    port: 22,
    username: "deploy",
    password: process.env.VPS_PASSWORD
  });
