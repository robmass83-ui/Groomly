export function revocaMembroAllUscita<T extends { status: string }>(member: T): T {
  if (member.status !== 'attivo') return member
  return { ...member, status: 'revocato' }
}
