import { Bug, CalendarDays, ChevronDown, ChevronRight, CirclePlus, Ellipsis, Euro, Eye, Languages, LayoutGrid, PawPrint, Send, Sparkles, Tag, UserRound, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { firebaseEnabled } from '../data/firebase/enabled'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { APP_VERSION } from '../lib/appVersion'
import { CATEGORIE_SUGGERIMENTO, type CategoriaSuggerimento } from '../lib/categorieSuggerimento'
import { TYPE } from '../theme/theme'
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

/** Colore e icona di ogni categoria: i tipi hanno il loro tono, le parti dell'app quello primario. */
const ASPETTO: Record<CategoriaSuggerimento, { icon: LucideIcon; tone: string; soft: string }> = {
  bug: { icon: Bug, tone: 'var(--bad)', soft: 'var(--bad-s)' },
  critica: { icon: Eye, tone: 'var(--warn)', soft: 'var(--warn-s)' },
  miglioramento: { icon: Sparkles, tone: 'var(--ok)', soft: 'var(--ok-s)' },
  manca: { icon: CirclePlus, tone: 'var(--sen)', soft: 'var(--sen-s)' },
  agenda: { icon: CalendarDays, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  animali: { icon: PawPrint, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  listino: { icon: Tag, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  incassi: { icon: Euro, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  account: { icon: UserRound, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  lingua: { icon: Languages, tone: 'var(--pri)', soft: 'var(--pri-s)' },
  altro: { icon: Ellipsis, tone: 'var(--pri)', soft: 'var(--pri-s)' },
}

const TIPI = [
  { id: 'bug', titolo: 'sugTitBug', desc: 'sugDescBug', aiuto: 'sugAiutoBug' },
  { id: 'critica', titolo: 'sugTitCritica', desc: 'sugDescCritica', aiuto: 'sugAiutoCritica' },
  { id: 'miglioramento', titolo: 'sugTitMigliora', desc: 'sugDescMigliora', aiuto: 'sugAiutoMigliora' },
  { id: 'manca', titolo: 'sugTitManca', desc: 'sugDescManca', aiuto: 'sugAiutoManca' },
] as const

const PARTI = CATEGORIE_SUGGERIMENTO.filter((id) => !TIPI.some((item) => item.id === id))

export function SuggerimentiPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : ''
  const [categoria, setCategoria] = useState<CategoriaSuggerimento | null>(null)
  const [partiAperte, setPartiAperte] = useState(false)
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [grazie, setGrazie] = useState(false)

  function apri(id: CategoriaSuggerimento) {
    setCategoria(id)
    setErrore('')
  }

  async function invia() {
    if (!categoria) return
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
      setCategoria(null)
      setGrazie(true)
    } catch {
      setErrore(frasi.sugErrore)
    } finally {
      setAttesa(false)
    }
  }

  const tipo = TIPI.find((item) => item.id === categoria)
  const aspetto = categoria ? ASPETTO[categoria] : null
  const IconaAperta = aspetto?.icon

  return (
    <ShellFrame>
      <Header title={frasi.hubSuggerimenti} backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: '0 2px', color: 'var(--tx2)', fontSize: TYPE.rowSub, lineHeight: 1.45 }}>{frasi.sugLeggiamo}</p>
        <div role="group" aria-label={frasi.sugScrivi} style={listCard}>
          {TIPI.map((item, index) => (
            <button key={item.id} type="button" onClick={() => apri(item.id)} style={{ ...rowButton, borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
              <IconTile id={item.id} size={38} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 700 }}>{frasi[item.titolo]}</span>
                <span style={rowSub}>{frasi[item.desc]}</span>
              </span>
              <ChevronRight size={17} aria-hidden style={{ color: 'var(--tx3)', flex: 'none' }} />
            </button>
          ))}
        </div>
        <div style={listCard}>
          <button type="button" aria-expanded={partiAperte} onClick={() => setPartiAperte((open) => !open)} style={rowButton}>
            <span style={{ ...tile(32), background: 'var(--pri-s)', color: 'var(--pri)' }}><LayoutGrid size={16} aria-hidden /></span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700 }}>{frasi.sugParteApp}</span>
              <span style={rowSub}>{frasi.sugParteAppDesc}</span>
            </span>
            <ChevronDown size={17} aria-hidden style={{ color: 'var(--tx3)', flex: 'none', transform: partiAperte ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
          </button>
          {partiAperte ? PARTI.map((id) => (
            <button key={id} type="button" onClick={() => apri(id)} style={{ ...rowButton, minHeight: 48, borderTop: '1px solid var(--line)', paddingLeft: 18 }}>
              <IconTile id={id} size={30} />
              <span style={{ flex: 1, minWidth: 0, fontWeight: 650 }}>{frasi[ETICHETTA[id]]}</span>
              <ChevronRight size={16} aria-hidden style={{ color: 'var(--tx3)', flex: 'none' }} />
            </button>
          )) : null}
        </div>
      </div>
      <Dialog open={categoria !== null} title={categoria ? frasi[ETICHETTA[categoria]] : ''} onClose={() => setCategoria(null)} portal>
        {aspetto && IconaAperta ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, background: aspetto.soft }}>
            <span style={{ ...tile(36), background: 'var(--card)', color: aspetto.tone }}><IconaAperta size={18} aria-hidden /></span>
            <span style={{ fontSize: TYPE.rowSub, lineHeight: 1.4, color: 'var(--tx)' }}>{tipo ? frasi[tipo.aiuto] : frasi.sugAiutoParte}</span>
          </div>
        ) : null}
        <textarea
          aria-label={frasi.sugTesto}
          placeholder={frasi.sugTesto}
          value={testo}
          maxLength={2000}
          onChange={(event) => setTesto(event.target.value)}
          style={{ minHeight: 140, maxHeight: 220, resize: 'none', font: 'inherit', padding: 12, borderRadius: 14, border: `1.5px solid ${aspetto?.tone ?? 'var(--line)'}`, background: 'var(--card)', color: 'var(--tx)', outline: 'none' }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ flex: 1, color: 'var(--bad)', fontSize: TYPE.rowSub }}>{errore}</span>
          <span style={{ fontSize: TYPE.meta, color: 'var(--tx3)', fontVariantNumeric: 'tabular-nums' }}>{testo.length} / 2000</span>
        </div>
        <Button onClick={() => { void invia() }} disabled={attesa} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Send size={16} aria-hidden />
          {frasi.sugInvia}
        </Button>
      </Dialog>
      <Dialog open={grazie} title={frasi.sugGrazie} onClose={() => setGrazie(false)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.sugGrazieTesto}</p>
        <Button onClick={() => setGrazie(false)}>{frasi.chiudi}</Button>
      </Dialog>
    </ShellFrame>
  )
}

function IconTile({ id, size }: { id: CategoriaSuggerimento; size: number }) {
  const { icon: Icon, tone, soft } = ASPETTO[id]
  return (
    <span style={{ ...tile(size), background: soft, color: tone }}>
      <Icon size={Math.round(size * 0.47)} aria-hidden />
    </span>
  )
}

function tile(size: number): CSSProperties {
  return { width: size, height: size, borderRadius: Math.round(size * 0.32), display: 'grid', placeItems: 'center', flex: 'none' }
}

const listCard: CSSProperties = {
  background: 'var(--card)',
  borderRadius: 16,
  boxShadow: 'var(--sh-1)',
  overflow: 'hidden',
}

const rowButton: CSSProperties = {
  width: '100%',
  minHeight: 60,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '10px 14px',
  border: 0,
  background: 'transparent',
  color: 'var(--tx)',
  font: 'inherit',
  fontSize: 15,
  textAlign: 'left',
}

const rowSub: CSSProperties = {
  display: 'block',
  marginTop: 2,
  fontSize: TYPE.meta,
  color: 'var(--tx2)',
  lineHeight: 1.35,
}
