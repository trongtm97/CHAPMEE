import { Client } from "ssh2";

const conn = new Client();
const cmd = `
echo "=== IMAGES ==="; docker images | head -n 12
echo "=== WEB CONTAINER ==="; docker inspect chapmee-web --format 'Image={{.Image}} Created={{.Created}} Started={{.State.StartedAt}}'
echo "=== BUILD PROCS ==="; ps -eo pid,etime,pcpu,comm | grep -E "buildkit|webpack|next-build|node" | grep -v grep
echo "=== APP SRC TIME ==="; stat -c '%y %n' /opt/chapmee/app/lib/editor/tiptap/create-extensions.ts 2>/dev/null
echo "=== TIPTAP TOOLBAR ON VPS ==="; grep -c "lucide-react" /opt/chapmee/app/components/editor/tiptap/TiptapToolbar.tsx 2>/dev/null
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
