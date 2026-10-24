const CHIAVE = 'groomly.backupDispositivo'
const TENUTA = 30 * 60 * 1000

export function dispositivoBackup(): string {
  const presente = localStorage.getItem(CHIAVE)
  if (presente) return presente
  const creato = crypto.randomUUID()
  localStorage.setItem(CHIAVE, creato)
  return creato
}

export async function prendiBlocco(now: Date): Promise<void> {
  const { transactionSalon } = await import('../data/firebase/client')
  const io = dispositivoBackup()
  await transactionSalon(async (tx) => {
    const doc = await tx.get('meta', 'backup-lock')
    const holder = typeof doc?.holder === 'string' ? doc.holder : ''
    const until = typeof doc?.until === 'number' ? doc.until : 0
    if (holder && holder !== io && until > now.getTime()) throw new Error('occupato')
    tx.set('meta', 'backup-lock', { holder: io, until: now.getTime() + TENUTA })
  })
}

export async function lasciaBlocco(): Promise<void> {
  const { transactionSalon } = await import('../data/firebase/client')
  const io = dispositivoBackup()
  await transactionSalon(async (tx) => {
    const doc = await tx.get('meta', 'backup-lock')
    if (doc?.holder !== io) return
    tx.set('meta', 'backup-lock', { holder: io, until: 0 })
  }).catch(() => undefined)
}
