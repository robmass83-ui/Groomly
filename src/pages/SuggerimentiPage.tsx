import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { firebaseEnabled } from '../data/firebase/enabled'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { APP_VERSION } from '../lib/appVersion'
import { CATEGORIE_SUGGERIMENTO, type CategoriaSuggerimento } from '../lib/categorieSuggerimento'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const ETICHETTA = {
  bug: 'sugCatBug',
  critica: 'sugCatCritica',
  miglioramento: 'sugCatMigliora',
  manca: 'sugCatManca',
  lingua: 'sugCatLingua',
  altro: 'sugCatAltro',
} as const satisfies Record<CategoriaSuggerimento, 'sugCatBug' | 'sugCatCritica' | 'sugCatMigliora' | 'sugCatManca' | 'sugCatLingua' | 'sugCatAltro'>

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
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 700 }}>
              {frasi.sugScrivi}
              <select value={categoria} onChange={(event) => setCategoria(event.target.value as CategoriaSuggerimento)} style={{ minHeight: 44, font: 'inherit' }}>
                {CATEGORIE_SUGGERIMENTO.map((id) => (
                  <option key={id} value={id}>{frasi[ETICHETTA[id]]}</option>
                ))}
              </select>
            </label>
            <textarea
              aria-label={frasi.sugScrivi}
              value={testo}
              maxLength={2000}
              onChange={(event) => setTesto(event.target.value)}
              style={{ minHeight: 120, font: 'inherit', padding: 8 }}
            />
            {errore ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
            <Button onClick={() => { void invia() }} disabled={attesa}>{frasi.sugInvia}</Button>
          </div>
        </Card>
        <Card>
          <Row style={{ borderTop: 'none', alignItems: 'flex-start', minHeight: 52 }}>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontWeight: 700 }}>{frasi.sugGuida}</span>
              <small style={{ color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.sugGuidaTesto}</small>
            </span>
          </Row>
        </Card>
        <Card>
          <Row style={{ borderTop: 'none', minHeight: 52 }}>
            {aggiornamentiApkAttivi() ? (
              <Link to="/impostazioni/aggiornamenti" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 }}>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 700 }}>{frasi.sugNovita}</span>
                  <small style={{ color: 'var(--tx3)' }}>{frasi.sugNovitaTesto}</small>
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </Link>
            ) : (
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 700 }}>{frasi.sugNovita}</span>
                <small style={{ color: 'var(--tx3)' }}>{frasi.sugNovitaTesto}</small>
              </span>
            )}
          </Row>
          <Row style={{ minHeight: 52 }}>
            <Link to="/impostazioni/notifiche" style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, color: 'inherit', textDecoration: 'none', minHeight: 44 }}>
              <span style={{ flex: 1 }}>{frasi.impNotifiche}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </Row>
        </Card>
      </div>
      <Dialog open={grazie} title={frasi.sugGrazie} onClose={() => setGrazie(false)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.sugGrazieTesto}</p>
        <Button onClick={() => setGrazie(false)}>{frasi.chiudi}</Button>
      </Dialog>
    </ShellFrame>
  )
}
