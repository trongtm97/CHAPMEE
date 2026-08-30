import { BRAND_NAME } from "@/lib/brand/constants";
import type { RankingShareBadgeData } from "@/lib/ranking/ranking-share";

const IMAGE_WIDTH = 1080;
const IMAGE_HEIGHT = 1920;

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

function medalColor(tier: RankingShareBadgeData["medalTier"]) {
  switch (tier) {
    case "gold":
      return "#FACC15";
    case "silver":
      return "#E4E4E7";
    case "bronze":
      return "#FB923C";
    default:
      return "#67E8F9";
  }
}

function medalLabel(tier: RankingShareBadgeData["medalTier"]) {
  switch (tier) {
    case "gold":
      return "Vàng";
    case "silver":
      return "Bạc";
    case "bronze":
      return "Đồng";
    default:
      return "Top";
  }
}

export async function exportRankingBadgeToImage(data: RankingShareBadgeData) {
  const canvas = document.createElement("canvas");
  canvas.width = IMAGE_WIDTH;
  canvas.height = IMAGE_HEIGHT;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, IMAGE_HEIGHT);
  gradient.addColorStop(0, "#101828");
  gradient.addColorStop(0.45, "#0b1320");
  gradient.addColorStop(1, "#05070d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

  context.fillStyle = "rgba(250, 204, 21, 0.12)";
  context.fillRect(0, 0, IMAGE_WIDTH, 420);
  context.fillStyle = "rgba(0, 0, 0, 0.55)";
  context.fillRect(0, IMAGE_HEIGHT - 680, IMAGE_WIDTH, 680);

  if (data.coverUrl) {
    try {
      const image = await loadImage(data.coverUrl);
      const coverWidth = 420;
      const coverHeight = 560;
      const coverX = (IMAGE_WIDTH - coverWidth) / 2;
      const coverY = 520;
      context.save();
      drawRoundedRect(context, coverX, coverY, coverWidth, coverHeight, 36);
      context.clip();
      context.drawImage(image, coverX, coverY, coverWidth, coverHeight);
      context.restore();
      context.strokeStyle = "rgba(255,255,255,0.18)";
      context.lineWidth = 3;
      drawRoundedRect(context, coverX, coverY, coverWidth, coverHeight, 36);
      context.stroke();
    } catch {
      // cover optional
    }
  }

  context.fillStyle = "#ffffff";
  context.font = "800 42px Arial, sans-serif";
  context.fillText(BRAND_NAME, 84, 110);

  context.fillStyle = "rgba(255,255,255,0.78)";
  context.font = "600 26px Arial, sans-serif";
  context.fillText("Bảng xếp hạng ChapMee", 84, 158);

  context.fillStyle = medalColor(data.medalTier);
  context.font = "900 34px Arial, sans-serif";
  context.fillText(`${medalLabel(data.medalTier)} · #${data.rank}`, 84, 240);

  context.fillStyle = "#ffffff";
  context.font = "800 52px Arial, sans-serif";
  context.fillText(`#${data.rank}`, 84, 320);

  context.fillStyle = "rgba(255,255,255,0.86)";
  context.font = "700 34px Arial, sans-serif";
  context.fillText(data.boardLabel, 84, 380);

  context.fillStyle = "rgba(125, 211, 252, 0.95)";
  context.font = "600 28px Arial, sans-serif";
  context.fillText(data.periodLabel, 84, 428);

  context.fillStyle = "#ffffff";
  context.font = "900 64px Arial, sans-serif";
  let cursorY = 1180;
  for (const line of wrapText(context, data.title, 912).slice(0, 3)) {
    context.fillText(line, 84, cursorY);
    cursorY += 74;
  }

  if (data.authorUsername) {
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "600 32px Arial, sans-serif";
    context.fillText(`@${data.authorUsername}`, 84, cursorY + 20);
    cursorY += 56;
  }

  const metricParts = [
    data.score > 0 ? `${data.score.toFixed(1)} điểm` : null,
    data.metric
  ].filter(Boolean);
  if (metricParts.length > 0) {
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "600 30px Arial, sans-serif";
    context.fillText(metricParts.join(" · "), 84, cursorY + 28);
  }

  context.fillStyle = "rgba(255,255,255,0.88)";
  context.font = "700 30px Arial, sans-serif";
  context.fillText(data.ctaLabel, 84, 1720);

  context.fillStyle = "rgba(255,255,255,0.55)";
  context.font = "500 24px Arial, sans-serif";
  const urlLines = wrapText(context, data.shareUrl, 912).slice(0, 2);
  urlLines.forEach((line, index) => {
    context.fillText(line, 84, 1780 + index * 34);
  });

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.96);
  });
}
