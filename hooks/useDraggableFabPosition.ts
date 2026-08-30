"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "chapmee-feedback-fab-position";
const DRAG_THRESHOLD_PX = 6;

export type FabPosition = {
  x: number;
  y: number;
};

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampToViewport(pos: FabPosition, width: number, height: number): FabPosition {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(8, window.innerWidth - width - 8);
  const maxY = Math.max(8, window.innerHeight - height - 8);
  return {
    x: clamp(pos.x, 8, maxX),
    y: clamp(pos.y, 8, maxY)
  };
}

function readStoredPosition(width = 48, height = 48): FabPosition | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FabPosition;
    if (
      typeof parsed?.x === "number" &&
      typeof parsed?.y === "number" &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return clampToViewport(parsed, width, height);
    }
  } catch {
    // ignore corrupt storage
  }
  return null;
}

export function useDraggableFabPosition() {
  const [position, setPosition] = useState<FabPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragSession | null>(null);
  const movedRef = useRef(false);

  useEffect(() => {
    setPosition(readStoredPosition());
  }, []);

  useEffect(() => {
    if (!position) return;
    function reclamp() {
      setPosition((current) => {
        if (!current) return current;
        const next = clampToViewport(current, 48, 48);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // private mode / quota
        }
        return next;
      });
    }
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [position]);

  const persist = useCallback((next: FabPosition) => {
    setPosition(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode / quota
    }
  }, []);

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) return;

      const dx = clientX - drag.startX;
      const dy = clientY - drag.startY;

      if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
        drag.moved = true;
        movedRef.current = true;
        setIsDragging(true);
      }

      if (!drag.moved) return;

      const maxX = window.innerWidth - drag.width - 8;
      const maxY = window.innerHeight - drag.height - 8;
      persist({
        x: clamp(drag.originX + dx, 8, maxX),
        y: clamp(drag.originY + dy, 8, maxY)
      });
    },
    [persist]
  );

  const finishDrag = useCallback(() => {
    const moved = movedRef.current;
    dragRef.current = null;
    movedRef.current = false;
    setIsDragging(false);
    return moved;
  }, []);

  useEffect(() => {
    function onWindowPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    }

    window.addEventListener("pointermove", onWindowPointerMove, { passive: false });

    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
    };
  }, [updateFromPointer]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;

      const rect = event.currentTarget.getBoundingClientRect();
      movedRef.current = false;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: rect.left,
        originY: rect.top,
        moved: false,
        width: rect.width,
        height: rect.height
      };

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    []
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return false;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      return finishDrag();
    },
    [finishDrag]
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      onPointerUp(event);
    },
    [onPointerUp]
  );

  return {
    position,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel
  };
}
