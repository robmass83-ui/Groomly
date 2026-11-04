import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { usePiano } from '../../hooks/usePiano'
import { useSession } from '../../hooks/useSession'
import { useFrasi } from '../../i18n/LinguaContext'

function chiave(data: string): string {
  return `groomly.b4.banner.${data}`
}

function chiuso(data: string): boolean {
  try {
    return localStorage.getItem(chiave(data)) === '1'
  } catch {
    return false
  }
}

// Annuncio dei pagamenti (15 giorni prima): lo vede il titolare finché gli abbonamenti non si accendono.
export function BannerPagamenti() {
  const frasi = useFrasi()
  const piano = usePiano()
  const session = useSession()
  const ruolo = session.gate.kind === 'in' ? session.gate.account.role : undefined
  const data = piano.acquisto?.pagamentiDal ?? null
  const [nascosto, setNascosto] = useState(() => (data ? chiuso(data) : false))
  if (!data || piano.abbonamentiAttivi || ruolo !== 'titolare' || nascosto || chiuso(data)) return null
  const giorno = new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(data))

  function chiudi() {
    try {
      localStorage.setItem(chiave(data as string), '1')
    } catch {
      // Senza memoria locale si richiude solo per questa visita.
    }
    setNascosto(true)
  }

  return (
    <div role="note" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 4px 10px 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line)' }}>
      <Megaphone aria-hidden size={18} color="var(--pri)" style={{ flex: 'none', marginTop: 2 }} />
      <p style={{ margin: 0, flex: 1, fontSize: 14, lineHeight: 1.4, color: 'var(--tx)' }}>{frasi.b4BannerPagamenti.replace('{{data}}', giorno)}</p>
      <button type="button" aria-label={frasi.b4Chiudi} onClick={chiudi} style={{ flex: 'none', width: 44, height: 44, marginTop: -10, border: 0, background: 'transparent', color: 'var(--tx3)', display: 'grid', placeItems: 'center' }}>
        <X aria-hidden size={18} />
      </button>
    </div>
  )
}
