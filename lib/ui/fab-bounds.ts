import type { FabPosition } from "@/hooks/useDraggableFabPosition";

const EDGE_PADDING = 8;
const MOBILE_BOTTOM_NAV_RESERVE = 76;

function safeAreaBottom(): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.paddingBottom = "env(safe-area-inset-bottom)";
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  document.body.removeChild(probe);
  return value;
}

export function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

export function getFabBounds(width: number, height: number) {
  const mobile = isMobileViewport();
  const bottomInset = safeAreaBottom();
  const bottomReserve = mobile ? MOBILE_BOTTOM_NAV_RESERVE + bottomInset + EDGE_PADDING : bottomInset + EDGE_PADDING;

  return {
    minX: EDGE_PADDING,
    minY: EDGE_PADDING,
    maxX: Math.max(EDGE_PADDING, window.innerWidth - width - EDGE_PADDING),
    maxY: Math.max(EDGE_PADDING, window.innerHeight - height - bottomReserve)
  };
}

export function clampFabPosition(
  position: FabPosition,
  width: number,
  height: number
): FabPosition {
  const bounds = getFabBounds(width, height);
  return {
    x: Math.min(Math.max(position.x, bounds.minX), bounds.maxX),
    y: Math.min(Math.max(position.y, bounds.minY), bounds.maxY)
  };
}

export function getDefaultFabPosition(width: number, height: number): FabPosition {
  const bounds = getFabBounds(width, height);
  return {
    x: bounds.maxX,
    y: bounds.maxY
  };
}
