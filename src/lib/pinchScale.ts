export function pinchScale(startDistance: number, nextDistance: number, startScale: number): number {
  if (startDistance <= 0 || nextDistance <= 0) return startScale
  return Math.min(4, Math.max(1, startScale * (nextDistance / startDistance)))
}
