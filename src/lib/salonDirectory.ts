export type DirectoryAccount = {
  uid: string
  firstName: string
  lastName: string
  email: string
  salonId: string
}

export type DirectoryEntry = {
  uid: string
  ownerName: string
  salonName: string
}

export type SalonDirectory = {
  accountCount: number
  salonCount: number
  entries: DirectoryEntry[]
}

export function businessName(data: Record<string, unknown> | null): string {
  const business = data?.business
  if (!business || typeof business !== 'object') return ''
  const name = (business as { name?: unknown }).name
  return typeof name === 'string' ? name.trim() : ''
}

function ownerLabel(account: DirectoryAccount): string {
  const name = `${account.firstName} ${account.lastName}`.replace(/\s+/g, ' ').trim()
  return name || account.email.trim() || 'Senza nome'
}

export function summarizeDirectory(accounts: DirectoryAccount[], salonNames: ReadonlyMap<string, string>): SalonDirectory {
  const salonIds = new Set(accounts.map((account) => account.salonId.trim()).filter((id) => id !== ''))
  const entries = accounts.flatMap((account) => {
    const salonId = account.salonId.trim()
    if (!salonId) return []
    const salonName = (salonNames.get(salonId) ?? '').trim() || 'Senza nome'
    return [{ uid: account.uid, ownerName: ownerLabel(account), salonName }]
  })
  entries.sort((left, right) => left.salonName.localeCompare(right.salonName, 'it')
    || left.ownerName.localeCompare(right.ownerName, 'it')
    || left.uid.localeCompare(right.uid))
  return { accountCount: accounts.length, salonCount: salonIds.size, entries }
}

export function accountSummary(count: number): string {
  return count === 1 ? '1 account creato' : `${count} account creati`
}

export function salonSummary(count: number): string {
  return count === 1 ? '1 toelettatura creata' : `${count} toelettature create`
}
