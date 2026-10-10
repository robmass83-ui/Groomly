export function permuteOrders(ids: string[], orders: number[], from: number, to: number): { id: string; order: number }[] {
  const next = ids.map((id, index) => ({ id, order: orders[index] }))
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return next
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next.map((item, index) => ({ id: item.id, order: orders[index] }))
}
