export function pinchScale(startDistance: number, nextDistance: number, startScale: number): number {
  if (startDistance <= 0 || nextDistance <= 0) return startScale
  return Math.min(8, Math.max(1, startScale * (nextDistance / startDistance)))
}

export function clampPan(x: number, y: number, scale: number, width: number, height: number): { x: number; y: number } {
  if (scale <= 1 || width <= 0 || height <= 0) return { x: 0, y: 0 }
  const maxX = ((scale - 1) * width) / 2
  const maxY = ((scale - 1) * height) / 2
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  }
}
