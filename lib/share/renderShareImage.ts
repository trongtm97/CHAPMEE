import { BRAND_NAME } from "@/lib/brand/constants";
import type { ShareCardPayload } from "@/types/share";

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1920;

function getPalette(kind: ShareCardPayload["kind"]) {
  if (kind === "swipe") {
    return ["#04070d", "#0f1724", "#181f2f"];
  }

  if (kind === "profile") {
    return ["#07111a", "#102031", "#172940"];
  }

  return ["#07111a", "#102031", "#16283b"];
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadImage(url: string) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";

  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = reject;
  });

  image.src = url;
  return loaded;
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const right = x + width;
  const bottom = y + height;

  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(right - radius, y);
  context.quadraticCurveTo(right, y, right, y + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(x + radius, bottom);
  context.quadraticCurveTo(x, bottom, x, bottom - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawChip(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  context.fillStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(context, x, y, width, 118, 28);
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = "600 24px Arial, sans-serif";
  context.fillText(label, x + 24, y + 40);

  context.fillStyle = "#ffffff";
  context.font = "800 34px Arial, sans-serif";
  const lines = wrapText(context, value, width - 48).slice(0, 2);
  lines.forEach((line, index) => {
    context.fillText(line, x + 24, y + 84 + index * 30);
  });
}

export async function exportCardToImage(payload: ShareCardPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const [top, mid, bottom] = getPalette(payload.kind);
  const gradient = context.createLinearGradient(0, 0, 0, IMAGE_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.56, mid);
  gradient.addColorStop(1, bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  let imageUsed = false;
  const imageUrl = payload.backgroundUrl ?? payload.coverUrl ?? null;
  if (imageUrl) {
    try {
      const image = await loadImage(imageUrl);
      const imageRatio = image.width / image.height;
      const targetRatio = IMAGE_WIDTH / IMAGE_HEIGHT;
      let drawWidth = IMAGE_WIDTH;
      let drawHeight = IMAGE_HEIGHT;
      let dx = 0;
      let dy = 0;

      if (imageRatio > targetRatio) {
        drawHeight = IMAGE_HEIGHT;
        drawWidth = Math.ceil(drawHeight * imageRatio);
        dx = Math.floor((IMAGE_WIDTH - drawWidth) / 2);
      } else {
        drawWidth = IMAGE_WIDTH;
        drawHeight = Math.ceil(drawWidth / imageRatio);
        dy = Math.floor((IMAGE_HEIGHT - drawHeight) / 2);
      }

      context.drawImage(image, dx, dy, drawWidth, drawHeight);
      imageUsed = true;
    } catch {
      imageUsed = false;
    }
  }

  context.fillStyle = imageUsed ? "rgba(4, 8, 14, 0.58)" : "rgba(4, 8, 14, 0.3)";
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
  context.fillStyle = "rgba(103, 232, 249, 0.14)";
  context.fillRect(0, 0, IMAGE_WIDTH, 380);
  context.fillStyle = "rgba(0, 0, 0, 0.56)";
  context.fillRect(0, IMAGE_HEIGHT - 620, IMAGE_WIDTH, 620);

  context.fillStyle = "rgba(255, 255, 255, 0.96)";
  context.font = "700 38px Arial, sans-serif";
  context.fillText(BRAND_NAME, 84, 118);

  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.font = "600 28px Arial, sans-serif";
  context.fillText(
    payload.kind === "swipe"
      ? "LƯỚT TRUYỆN"
      : payload.kind === "profile"
        ? "HỒ SƠ"
        : "THÀNH TÍCH",
    84,
    170
  );

  context.fillStyle = "#ffffff";
  context.font = "900 72px Arial, sans-serif";
  const titleMaxWidth = 912;
  const titleLines = wrapText(context, payload.title, titleMaxWidth).slice(0, 3);
  let cursorY = payload.kind === "swipe" ? 940 : 900;
  for (const line of titleLines) {
    context.fillText(line, 84, cursorY);
    cursorY += 82;
  }

  if (payload.authorName) {
    context.fillStyle = "rgba(255, 255, 255, 0.84)";
    context.font = "600 34px Arial, sans-serif";
    context.fillText(payload.authorName, 84, cursorY + 18);
    cursorY += 70;
  }

  if (payload.genreName) {
    context.fillStyle = "rgba(125, 211, 252, 0.95)";
    context.font = "700 28px Arial, sans-serif";
    context.fillText(payload.genreName, 84, cursorY + 14);
  }

  const bodyText =
    payload.kind === "swipe"
      ? payload.excerpt ?? payload.text
      : payload.hook ?? payload.text;
  if (bodyText) {
    context.fillStyle = "rgba(246, 250, 255, 0.94)";
    context.font = "500 40px Arial, sans-serif";
    const lines = wrapText(context, bodyText, 912).slice(0, 6);
    let textY = payload.kind === "swipe" ? 1090 : 1040;
    for (const line of lines) {
      context.fillText(line, 84, textY);
      textY += 56;
    }
  }

  if (payload.stats?.length) {
    const statY = 1490;
    const totalGap = 48;
    const statWidth = Math.floor((IMAGE_WIDTH - 168 - totalGap) / 3);
    let statX = 84;

    for (const stat of payload.stats.slice(0, 3)) {
      drawChip(context, stat.label, stat.value, statX, statY, statWidth);
      statX += statWidth + 24;
    }
  }

  context.fillStyle = "rgba(255,255,255,0.8)";
  context.font = "700 28px Arial, sans-serif";
  const cta =
    payload.ctaLabel ??
    (payload.kind === "swipe"
      ? `Lướt truyện này trên ${BRAND_NAME}`
      : `Đọc tiếp trên ${BRAND_NAME}`);
  context.fillText(cta, 84, 1820);

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.96);
  });
}

export function getShareImageFilename(payload: ShareCardPayload) {
  const raw = payload.slug || payload.title || "chapmee-share";
  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u1EF9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${safe || "chapmee-share"}.png`;
}
