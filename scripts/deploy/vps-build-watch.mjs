/** Show the tail of the detached VPS build log and report completion status. */
import { Client } from "ssh2";

const conn = new Client();
const cmd = `
echo "--- tail /tmp/chapmee-build.log ---"
tail -n 25 /tmp/chapmee-build.log 2>/dev/null
echo "--- status ---"
if grep -q "ALL_DONE" /tmp/chapmee-build.log 2>/dev/null; then echo "STATE=FINISHED"; else echo "STATE=RUNNING"; fi
docker ps --format '{{.Names}}\t{{.Status}}' | grep chapmee-web
`;

conn
  .on("ready", () => {
    conn.exec(cmd, (err, stream) => {
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
