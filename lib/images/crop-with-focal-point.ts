export type FocalPoint = {
  x: number;
  y: number;
};

export type CropRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function clampFocal(value: number) {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, value));
}

/**
 * Cover-crop rectangle on source image for a target aspect ratio, centered on focal point.
 */
export function getCoverCropRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  focal: FocalPoint = { x: 0.5, y: 0.5 }
): CropRect {
  const focalX = clampFocal(focal.x);
  const focalY = clampFocal(focal.y);
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (sourceAspect > targetAspect) {
    cropHeight = sourceHeight;
    cropWidth = Math.round(sourceHeight * targetAspect);
  } else {
    cropWidth = sourceWidth;
    cropHeight = Math.round(sourceWidth / targetAspect);
  }

  cropWidth = Math.min(cropWidth, sourceWidth);
  cropHeight = Math.min(cropHeight, sourceHeight);

  const focalPixelX = focalX * sourceWidth;
  const focalPixelY = focalY * sourceHeight;

  let left = Math.round(focalPixelX - cropWidth / 2);
  let top = Math.round(focalPixelY - cropHeight / 2);

  left = Math.max(0, Math.min(left, sourceWidth - cropWidth));
  top = Math.max(0, Math.min(top, sourceHeight - cropHeight));

  return {
    left,
    top,
    width: cropWidth,
    height: cropHeight
  };
}
