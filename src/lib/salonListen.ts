export function shouldSeedServices(empty: boolean, fromCache: boolean): boolean {
  return empty && !fromCache
}
