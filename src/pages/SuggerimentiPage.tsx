import { Check } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { firebaseEnabled } from '../data/firebase/enabled'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { APP_VERSION } from '../lib/appVersion'
import { CATEGORIE_SUGGERIMENTO, type CategoriaSuggerimento } from '../lib/categorieSuggerimento'
import { ShellFrame } from './ShellFrame'

const ETICHETTA = {
  bug: 'sugCatBug',
  critica: 'sugCatCritica',
  miglioramento: 'sugCatMigliora',
  manca: 'sugCatManca',
  agenda: 'sugCatAgenda',
  animali: 'sugCatAnimali',
  listino: 'sugCatListino',
  incassi: 'sugCatIncassi',
  account: 'sugCatAccount',
  lingua: 'sugCatLingua',
  altro: 'sugCatAltro',
} as const satisfies Record<CategoriaSuggerimento, 'sugCatBug' | 'sugCatCritica' | 'sugCatMigliora' | 'sugCatManca' | 'sugCatAgenda' | 'sugCatAnimali' | 'sugCatListino' | 'sugCatIncassi' | 'sugCatAccount' | 'sugCatLingua' | 'sugCatAltro'>

export function SuggerimentiPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : ''
  const [categoria, setCategoria] = useState<CategoriaSuggerimento>('bug')
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [grazie, setGrazie] = useState(false)

  async function invia() {
    const nota = testo.trim()
    if (nota.length < 10) {
      setErrore(frasi.sugBreve)
      return
    }
    if (nota.length > 2000) {
      setErrore(frasi.sugTroppo)
      return
    }
    if (!firebaseEnabled()) {
      setErrore(frasi.sugErrore)
      return
    }
    setAttesa(true)
    setErrore('')
    try {
      const { inviaSuggerimento } = await import('../data/firebase/client')
      await inviaSuggerimento({ email, categoria, testo: nota, lingua, versione: APP_VERSION })
      setTesto('')
      setGrazie(true)
    } catch {
      setErrore(frasi.sugErrore)
    } finally {
      setAttesa(false)
    }
  }

  return (
    <ShellFrame>
      <Header title={frasi.hubSuggerimenti} backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Card>
          <div role="radiogroup" aria-label={frasi.sugScrivi}>
            {CATEGORIE_SUGGERIMENTO.map((id, index) => {
              const acceso = categoria === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={acceso}
                  onClick={() => setCategoria(id)}
                  style={{
                    width: '100%',
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    border: 0,
                    borderTop: index === 0 ? 'none' : '1px solid var(--line)',
                    background: acceso ? 'var(--pri-s)' : 'transparent',
                    color: acceso ? 'var(--pri-ink)' : 'var(--tx)',
                    font: 'inherit',
                    fontSize: 14,
                    fontWeight: 650,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ flex: 1 }}>{frasi[ETICHETTA[id]]}</span>
                  {acceso ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
                </button>
              )
            })}
          </div>
        </Card>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 700 }}>
          {frasi.sugTesto}
          <textarea
            aria-label={frasi.sugTesto}
            value={testo}
            maxLength={2000}
            onChange={(event) => setTesto(event.target.value)}
            style={{ minHeight: 96, maxHeight: 160, font: 'inherit', padding: 8, borderRadius: 10, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tx)' }}
          />
        </label>
        {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
        <Button onClick={() => { void invia() }} disabled={attesa}>{frasi.sugInvia}</Button>
      </div>
      <Dialog open={grazie} title={frasi.sugGrazie} onClose={() => setGrazie(false)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.sugGrazieTesto}</p>
        <Button onClick={() => setGrazie(false)}>{frasi.chiudi}</Button>
      </Dialog>
    </ShellFrame>
  )
}
