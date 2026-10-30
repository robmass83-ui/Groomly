import { Bell, CheckCheck, Gift, Plus, Sparkles, Trash2, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { useAvvisiSistema } from '../hooks/useAvvisiSistema'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { dataCorta } from '../i18n/format'
import { dividiAvvisi, lettiDopoApertura, TESTO_MAX, TIPI_AVVISO, TITOLO_MAX, type AvvisoSistema, type TipoAvviso } from '../lib/avvisiSistema'
import { isOperator } from '../lib/salonPath'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

/** Quanto resta visibile il pallino rosso prima che arrivi la spunta di lettura. */
const ATTESA_SPUNTA_MS = 700

const ASPETTO: Record<TipoAvviso, { icon: LucideIcon; tone: string; soft: string; etichetta: 'avsTipoImportante' | 'avsTipoAggiornamento' | 'avsTipoManutenzione' | 'avsTipoNovita' }> = {
  importante: { icon: TriangleAlert, tone: 'var(--bad)', soft: 'var(--bad-s)', etichetta: 'avsTipoImportante' },
  aggiornamento: { icon: Sparkles, tone: 'var(--pri)', soft: 'var(--pri-s)', etichetta: 'avsTipoAggiornamento' },
  manutenzione: { icon: Wrench, tone: 'var(--warn)', soft: 'var(--warn-s)', etichetta: 'avsTipoManutenzione' },
  novita: { icon: Gift, tone: 'var(--ok)', soft: 'var(--ok-s)', etichetta: 'avsTipoNovita' },
}

export function AvvisiSistemaPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const operatore = isOperator(account?.email)
  const { avvisi, lettiFino, pronti, segnaLetti } = useAvvisiSistema(account?.uid ?? '')
  // Cosa era già letto quando si è aperta la pagina: decide cosa resta in evidenza durante la visita.
  const apertura = useRef<number | null>(null)
  if (pronti && apertura.current === null) apertura.current = lettiFino
  const lettiAllApertura = apertura.current ?? lettiFino

  const [scrivi, setScrivi] = useState(false)
  const [daEliminare, setDaEliminare] = useState<AvvisoSistema | null>(null)

  const fino = lettiDopoApertura(avvisi, lettiFino)
  useEffect(() => {
    if (!pronti || fino <= lettiFino) return
    const id = setTimeout(() => segnaLetti(fino), ATTESA_SPUNTA_MS)
    return () => clearTimeout(id)
  }, [pronti, fino, lettiFino, segnaLetti])

  const { evidenza, altri } = dividiAvvisi(avvisi, lettiAllApertura)
  const stato = (avviso: AvvisoSistema) => ({
    letto: avviso.creato <= lettiFino,
    appenaLetto: avviso.creato > lettiAllApertura,
  })

  async function elimina() {
    if (!daEliminare) return
    const id = daEliminare.id
    setDaEliminare(null)
    try {
      const { eliminaAvvisoSistema } = await import('../data/firebase/client')
      await eliminaAvvisoSistema(id)
    } catch {
      // La lista resta quella del server: se non si è cancellato, l'avviso si vede ancora.
    }
  }

  return (
    <ShellFrame>
      <Header
        title={frasi.hubAvvisi}
        backTo="/impostazioni"
        action={operatore ? (
          <IconButton label={frasi.avsScrivi} onClick={() => setScrivi(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden />
          </IconButton>
        ) : undefined}
      />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {pronti && avvisi.length === 0 ? (
          <div style={{ flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
            <span style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--pri-s)', color: 'var(--pri)', display: 'grid', placeItems: 'center' }}>
              <Bell size={32} strokeWidth={1.8} aria-hidden />
            </span>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{frasi.avsVuoto}</span>
            <span style={{ color: 'var(--tx2)', fontSize: TYPE.rowSub, lineHeight: 1.45, maxWidth: 280 }}>{frasi.avsVuotoTesto}</span>
          </div>
        ) : null}

        {evidenza.map((avviso) => (
          <article key={avviso.id} aria-label={avviso.titolo} style={{ background: 'var(--bad-s)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bad)', fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <TriangleAlert size={16} strokeWidth={2.2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.avsTipoImportante}</span>
              <span style={{ color: 'var(--tx2)', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>{dataCorta(lingua, new Date(avviso.creato))}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{avviso.titolo}</span>
            {avviso.testo ? <span style={testo}>{avviso.testo}</span> : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              {operatore ? <EliminaBottone label={frasi.avsElimina} onClick={() => setDaEliminare(avviso)} /> : null}
              <span style={{ flex: 1 }} />
              <Spunta {...stato(avviso)} label={frasi.avsLetto} />
            </div>
          </article>
        ))}

        {evidenza.length > 0 && altri.length > 0 ? (
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--tx2)', margin: '6px 2px 0' }}>{frasi.avsAltri}</div>
        ) : null}

        {altri.map((avviso) => {
          const { icon: Icona, tone, soft, etichetta } = ASPETTO[avviso.tipo]
          const { letto, appenaLetto } = stato(avviso)
          return (
            <article key={avviso.id} aria-label={avviso.titolo} style={{ background: 'var(--card)', borderRadius: 16, boxShadow: 'var(--sh-1)', padding: 12, display: 'flex', gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 12, background: soft, color: tone, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icona size={18} strokeWidth={2} aria-hidden />
              </span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: TYPE.meta, color: tone, fontWeight: 700 }}>{frasi[etichetta]} · <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{dataCorta(lingua, new Date(avviso.creato))}</span></span>
                <span style={{ fontWeight: letto && !appenaLetto ? 600 : 700, lineHeight: 1.3 }}>{avviso.titolo}</span>
                {avviso.testo ? <span style={testo}>{avviso.testo}</span> : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  {operatore ? <EliminaBottone label={frasi.avsElimina} onClick={() => setDaEliminare(avviso)} /> : null}
                  <span style={{ flex: 1 }} />
                  <Spunta letto={letto} appenaLetto={appenaLetto} label={frasi.avsLetto} />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {operatore ? <ScriviAvviso open={scrivi} onClose={() => setScrivi(false)} /> : null}
      <Dialog open={daEliminare !== null} title={frasi.avsEliminaTitolo} onClose={() => setDaEliminare(null)} portal>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{daEliminare?.titolo}</p>
        <Button variant="bad" onClick={() => { void elimina() }}>{frasi.avsElimina}</Button>
      </Dialog>
    </ShellFrame>
  )
}

/** Pallino rosso finché l'avviso non è letto, poi la doppia spunta: blu se letto in questa visita. */
function Spunta({ letto, appenaLetto, label }: { letto: boolean; appenaLetto: boolean; label: string }) {
  if (!letto) return <span aria-hidden style={{ width: 9, height: 9, borderRadius: 5, background: 'var(--bad)', flex: 'none' }} />
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: TYPE.meta, fontWeight: 650, color: appenaLetto ? 'var(--pri)' : 'var(--tx3)', animation: appenaLetto ? 'spunta-letto .25s ease-out' : undefined }}>
      <CheckCheck size={16} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  )
}

function EliminaBottone({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0, minWidth: 44, minHeight: 32, display: 'inline-flex', alignItems: 'center' }}>
      <Trash2 size={16} strokeWidth={2} aria-hidden />
    </button>
  )
}

function ScriviAvviso({ open, onClose }: { open: boolean; onClose: () => void }) {
  const frasi = useFrasi()
  const [tipo, setTipo] = useState<TipoAvviso>('aggiornamento')
  const [titolo, setTitolo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)

  async function pubblica() {
    const titoloPulito = titolo.trim()
    if (titoloPulito === '') {
      setErrore(frasi.avsTitoloVuoto)
      return
    }
    setAttesa(true)
    setErrore('')
    try {
      const { pubblicaAvvisoSistema } = await import('../data/firebase/client')
      await pubblicaAvvisoSistema({ tipo, titolo: titoloPulito, testo: corpo.trim() })
      setTitolo('')
      setCorpo('')
      onClose()
    } catch {
      setErrore(frasi.avsErrore)
    } finally {
      setAttesa(false)
    }
  }

  return (
    <Dialog open={open} title={frasi.avsScrivi} onClose={onClose} portal>
      <div role="radiogroup" aria-label={frasi.avsTipo} style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {TIPI_AVVISO.map((id) => {
          const { tone, soft, etichetta } = ASPETTO[id]
          const scelto = id === tipo
          return (
            <button key={id} type="button" role="radio" aria-checked={scelto} onClick={() => setTipo(id)} style={{ border: `1.5px solid ${scelto ? tone : 'transparent'}`, background: soft, color: tone, borderRadius: 999, font: 'inherit', fontWeight: 700, fontSize: 13, padding: '0 12px', minHeight: 36 }}>
              {frasi[etichetta]}
            </button>
          )
        })}
      </div>
      <input aria-label={frasi.avsTitolo} placeholder={frasi.avsTitolo} value={titolo} maxLength={TITOLO_MAX} onChange={(event) => setTitolo(event.target.value)} style={campo} />
      <textarea aria-label={frasi.avsTesto} placeholder={frasi.avsTesto} value={corpo} maxLength={TESTO_MAX} onChange={(event) => setCorpo(event.target.value)} style={{ ...campo, minHeight: 120, maxHeight: 220, resize: 'none' }} />
      {errore ? <span style={{ color: 'var(--bad)', fontSize: TYPE.rowSub }}>{errore}</span> : null}
      <Button onClick={() => { void pubblica() }} disabled={attesa}>{frasi.avsPubblica}</Button>
    </Dialog>
  )
}

const testo: CSSProperties = { fontSize: TYPE.rowSub, color: 'var(--tx2)', lineHeight: 1.45, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }

const campo: CSSProperties = { font: 'inherit', padding: 12, borderRadius: 14, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', outline: 'none' }
