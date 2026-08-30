/**
 * Static validation for Read ↔ Listen bridge (story-level).
 * Run: npx tsx scripts/validate-read-listen-bridge.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src", "app", "components", "lib"] as const;

type Check = { name: string; passed: boolean; details: string };

function check(name: string, predicate: () => void): Check {
  try {
    predicate();
    return { name, passed: true, details: "OK" };
  } catch (error) {
    return {
      name,
      passed: false,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function expectTrue(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

function walkFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    const stat = statSync(full);
    if (stat.isDirectory()) walkFiles(full, acc);
    else if (/\.(tsx?|jsx?)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function scanSource(): string {
  const chunks: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(join(ROOT, dir))) {
      chunks.push(readFileSync(file, "utf8"));
    }
  }
  return chunks.join("\n");
}

function main() {
  const source = scanSource();
  const checks: Check[] = [
    check("No Nghe chương này in UI source", () => {
      expectTrue(!/Nghe chương này/.test(source), "Found forbidden Nghe chương này");
    }),
    check("GlobalAudioQueueItem has storyHref", () => {
      const store = readFileSync(join(ROOT, "src/lib/audio/audio-player-store.ts"), "utf8");
      expectTrue(/storyHref:\s*string/.test(store), "storyHref missing from queue item type");
    }),
    check("playQueue supports fromBeginning", () => {
      const provider = readFileSync(join(ROOT, "src/components/audio/GlobalAudioProvider.tsx"), "utf8");
      expectTrue(/fromBeginning/.test(provider), "fromBeginning flag not found");
    }),
    check("getListeningProgressAction exists", () => {
      const actions = readFileSync(join(ROOT, "app/actions/audio-items.ts"), "utf8");
      expectTrue(/getListeningProgressAction/.test(actions), "missing getListeningProgressAction");
    }),
    check("global-media-coordinator exists", () => {
      const coord = readFileSync(join(ROOT, "src/lib/media/global-media-coordinator.ts"), "utf8");
      expectTrue(/pauseEmbeddedMedia/.test(coord), "pauseEmbeddedMedia missing");
    }),
    check("Youtube embed uses enablejsapi", () => {
      const yt = readFileSync(join(ROOT, "src/components/audio/YoutubeEmbedPlayer.tsx"), "utf8");
      expectTrue(/enablejsapi=1/.test(yt), "YouTube embed missing enablejsapi=1");
    }),
    check("Mini player mobile bottom offset", () => {
      const mini = readFileSync(join(ROOT, "src/components/audio/GlobalAudioMiniPlayer.tsx"), "utf8");
      expectTrue(/bottom-\[calc\(4\.5rem/.test(mini), "mini player missing bottom nav offset");
    }),
    check("/audio page has single h1", () => {
      const page = readFileSync(join(ROOT, "app/audio/page.tsx"), "utf8");
      const h1Count = (page.match(/<h1\b/g) ?? []).length;
      expectTrue(h1Count === 1, `expected 1 h1 on /audio, found ${h1Count}`);
    }),
    check("StoryAudioCTABox is story-level", () => {
      const cta = readFileSync(join(ROOT, "components/reader/StoryAudioCTABox.tsx"), "utf8");
      expectTrue(/Truyện này có bản audio/.test(cta), "missing story-level CTA copy");
      expectTrue(!/Nghe chương/.test(cta), "chapter-level CTA in StoryAudioCTABox");
    })
  ];

  const failed = checks.filter((c) => !c.passed);
  for (const c of checks) {
    console.log(`${c.passed ? "✓" : "✗"} ${c.name}${c.passed ? "" : `: ${c.details}`}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main();
