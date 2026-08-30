import { BRAND_NAME } from "@/lib/brand/constants";
import {
  isReelsShareKind,
  REELS_SHARE_BADGE_LABEL,
  REELS_SHARE_CTA_LABEL
} from "@/lib/routes/reels-paths";
import type { ShareCardPayload } from "@/types/share";

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1920;

function getFallbackPalette(kind: ShareCardPayload["kind"]): [string, string, string] {
  if (isReelsShareKind(kind)) {
    return ["#04070d", "#0f1724", "#181f2f"];
  }
  if (kind === "profile" || kind === "achievement") {
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

function paintFallbackGradient(context: CanvasRenderingContext2D, colors: [string, string, string]) {
  const [top, mid, bottom] = colors;
  const gradient = context.createLinearGradient(0, 0, 0, IMAGE_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.56, mid);
  gradient.addColorStop(1, bottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
}

async function paintCoverImage(context: CanvasRenderingContext2D, imageUrl: string | null) {
  if (!imageUrl) return false;

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
    return true;
  } catch {
    return false;
  }
}

function paintShareOverlays(context: CanvasRenderingContext2D) {
  const overlay = context.createLinearGradient(0, 0, 0, IMAGE_HEIGHT);
  overlay.addColorStop(0, "rgba(5, 8, 12, 0.12)");
  overlay.addColorStop(0.46, "rgba(5, 8, 12, 0.45)");
  overlay.addColorStop(1, "rgba(5, 8, 12, 0.92)");
  context.fillStyle = overlay;
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
}

function drawTopBadge(
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  align: "left" | "right" = "left"
) {
  context.font = "700 26px Arial, sans-serif";
  const paddingX = 28;
  const paddingY = 16;
  const textWidth = context.measureText(label).width;
  const badgeWidth = textWidth + paddingX * 2;
  const badgeHeight = 56;
  const badgeX = align === "right" ? x - badgeWidth : x;

  context.fillStyle = "rgba(0, 0, 0, 0.25)";
  drawRoundedRect(context, badgeX, y, badgeWidth, badgeHeight, badgeHeight / 2);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.15)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#ffffff";
  context.fillText(label, badgeX + paddingX, y + badgeHeight - paddingY);
}

function drawStatChip(
  context: CanvasRenderingContext2D,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  context.fillStyle = "rgba(255,255,255,0.05)";
  drawRoundedRect(context, x, y, width, 118, 28);
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.10)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "rgba(255,255,255,0.72)";
  context.font = "700 22px Arial, sans-serif";
  context.fillText(label.toUpperCase(), x + 24, y + 38);

  context.fillStyle = "#ffffff";
  context.font = "800 34px Arial, sans-serif";
  const lines = wrapText(context, value, width - 48).slice(0, 1);
  context.fillText(lines[0] ?? value, x + 24, y + 84);
}

function drawMediaShareCard(context: CanvasRenderingContext2D, payload: ShareCardPayload) {
  const isReel = isReelsShareKind(payload.kind);
  const panelX = 40;
  const panelW = IMAGE_WIDTH - 80;
  const panelPad = 48;
  const innerW = panelW - panelPad * 2;
  let panelContentHeight = 56;

  const bodyText = isReel ? payload.excerpt ?? payload.text : payload.hook ?? payload.text;
  const kicker = isReel ? REELS_SHARE_CTA_LABEL : "Đọc tiếp trên ChapMee";
  const badgeLabel = isReel ? REELS_SHARE_BADGE_LABEL : "Story share";
  const cta =
    payload.ctaLabel ??
    (isReel ? REELS_SHARE_CTA_LABEL : "Đọc tiếp trên ChapMee");

  context.font = "900 68px Arial, sans-serif";
  panelContentHeight += wrapText(context, payload.title, innerW).slice(0, 3).length * 72 + 24;
  if (payload.authorName) panelContentHeight += 52;
  if (payload.genreName) panelContentHeight += 44;
  if (bodyText) {
    context.font = "500 38px Arial, sans-serif";
    panelContentHeight += wrapText(context, bodyText, innerW).slice(0, 5).length * 52 + 16;
  }
  if (payload.stats?.length) panelContentHeight += 132;
  panelContentHeight += 72;

  const panelH = Math.min(Math.max(panelContentHeight, 560), 860);
  const panelTop = IMAGE_HEIGHT - panelH - 48;

  context.save();
  drawRoundedRect(context, panelX, panelTop, panelW, panelH, 48);
  const panelGrad = context.createLinearGradient(0, panelTop, 0, panelTop + panelH);
  panelGrad.addColorStop(0, "rgba(7,10,15,0.28)");
  panelGrad.addColorStop(1, "rgba(7,10,15,0.78)");
  context.fillStyle = panelGrad;
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.10)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  drawTopBadge(context, BRAND_NAME, 48, 56, "left");
  drawTopBadge(context, badgeLabel, IMAGE_WIDTH - 48, 56, "right");

  let y = panelTop + 56;
  const innerX = panelX + panelPad;

  context.fillStyle = "rgba(103,232,249,0.95)";
  context.font = "700 28px Arial, sans-serif";
  context.fillText(kicker.toUpperCase(), innerX, y);
  y += 52;

  context.fillStyle = "#ffffff";
  context.font = "900 68px Arial, sans-serif";
  for (const line of wrapText(context, payload.title, innerW).slice(0, 3)) {
    context.fillText(line, innerX, y);
    y += 72;
  }
  y += 8;

  if (payload.authorName) {
    context.fillStyle = "rgba(255,255,255,0.84)";
    context.font = "600 36px Arial, sans-serif";
    context.fillText(payload.authorName, innerX, y);
    y += 48;
  }

  if (payload.genreName) {
    context.fillStyle = "rgba(125, 211, 252, 0.95)";
    context.font = "700 28px Arial, sans-serif";
    context.fillText(payload.genreName, innerX, y);
    y += 40;
  }

  if (bodyText) {
    context.fillStyle = "rgba(246, 250, 255, 0.94)";
    context.font = "500 38px Arial, sans-serif";
    for (const line of wrapText(context, bodyText, innerW).slice(0, 5)) {
      context.fillText(line, innerX, y);
      y += 52;
    }
    y += 8;
  }

  if (payload.stats?.length) {
    const stats = payload.stats.slice(0, 2);
    const gap = 24;
    const statWidth = Math.floor((innerW - gap) / stats.length);
    stats.forEach((stat, index) => {
      drawStatChip(context, stat.label, stat.value, innerX + index * (statWidth + gap), y, statWidth);
    });
  }

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = "700 30px Arial, sans-serif";
  context.fillText(cta, innerX, panelTop + panelH - 48);

  context.fillStyle = "rgba(103,232,249,0.95)";
  context.font = "800 24px Arial, sans-serif";
  const brandWidth = context.measureText(BRAND_NAME).width;
  context.fillText(BRAND_NAME, panelX + panelW - panelPad - brandWidth, panelTop + panelH - 48);
}

function drawProfileShareCard(context: CanvasRenderingContext2D, payload: ShareCardPayload) {
  const isProfile = payload.kind === "profile";
  const badgeLabel = isProfile ? "Profile share" : "Achievement share";
  const kicker = isProfile ? "Reader / Author profile" : "Achievement";
  const panelX = 40;
  const panelW = IMAGE_WIDTH - 80;
  const panelPad = 48;
  const innerW = panelW - panelPad * 2;
  const panelTop = 760;
  const panelH = IMAGE_HEIGHT - panelTop - 48;

  drawTopBadge(context, BRAND_NAME, 48, 56, "left");
  drawTopBadge(context, badgeLabel, IMAGE_WIDTH - 48, 56, "right");

  context.save();
  drawRoundedRect(context, panelX, panelTop, panelW, panelH, 48);
  const panelGrad = context.createLinearGradient(0, panelTop, 0, panelTop + panelH);
  panelGrad.addColorStop(0, "rgba(7,10,15,0.24)");
  panelGrad.addColorStop(1, "rgba(7,10,15,0.82)");
  context.fillStyle = panelGrad;
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.10)";
  context.lineWidth = 2;
  context.stroke();
  context.restore();

  const innerX = panelX + panelPad;
  let y = panelTop + 56;

  context.fillStyle = "rgba(103,232,249,0.95)";
  context.font = "700 26px Arial, sans-serif";
  context.fillText(kicker.toUpperCase(), innerX, y);
  y += 48;

  context.fillStyle = "#ffffff";
  context.font = "900 64px Arial, sans-serif";
  for (const line of wrapText(context, payload.title, innerW).slice(0, 3)) {
    context.fillText(line, innerX, y);
    y += 68;
  }
  y += 16;

  if (payload.bio || payload.text) {
    const copy = payload.bio ?? payload.text ?? "";
    context.fillStyle = "rgba(246, 250, 255, 0.94)";
    context.font = "500 36px Arial, sans-serif";
    for (const line of wrapText(context, copy, innerW).slice(0, 4)) {
      context.fillText(line, innerX, y);
      y += 48;
    }
    y += 8;
  }

  if (payload.stats?.length) {
    const stats = payload.stats.slice(0, 4);
    const cols = 2;
    const gap = 24;
    const statWidth = Math.floor((innerW - gap) / cols);
    stats.forEach((stat, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      drawStatChip(
        context,
        stat.label,
        stat.value,
        innerX + col * (statWidth + gap),
        y + row * 132,
        statWidth
      );
    });
  }
}

export async function exportCardToImage(payload: ShareCardPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  paintFallbackGradient(context, getFallbackPalette(payload.kind));

  const imageUrl = payload.backgroundUrl ?? payload.coverUrl ?? null;
  const imageUsed = await paintCoverImage(context, imageUrl);
  if (!imageUsed) {
    paintFallbackGradient(context, getFallbackPalette(payload.kind));
  }
  paintShareOverlays(context);

  if (payload.kind === "profile" || payload.kind === "achievement") {
    drawProfileShareCard(context, payload);
  } else {
    drawMediaShareCard(context, payload);
  }

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
