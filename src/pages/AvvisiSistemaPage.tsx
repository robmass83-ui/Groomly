import { Bell, CheckCheck, Gift, Sparkles, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type CSSProperties } from 'react'
import { AvvisiBetaLista } from '../components/beta/AvvisiBetaLista'
import { useBeta } from '../components/beta/BetaProvider'
import { Header } from '../components/layout/Header'
import { useAvvisiSistema } from '../hooks/useAvvisiSistema'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { dataCorta } from '../i18n/format'
import { dividiAvvisi, lettiDopoApertura, testoPerLingua, type AvvisoSistema, type TipoAvviso } from '../lib/avvisiSistema'
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
  const { avvisi, lettiFino, pronti, segnaLetti } = useAvvisiSistema(account?.uid ?? '')
  const avvisiBeta = useBeta().avvisi
  // Cosa era già letto quando si è aperta la pagina: decide cosa resta in evidenza durante la visita.
  const apertura = useRef<number | null>(null)
  if (pronti && apertura.current === null) apertura.current = lettiFino
  const lettiAllApertura = apertura.current ?? lettiFino


  const fino = lettiDopoApertura(avvisi, lettiFino)
  useEffect(() => {
    if (!pronti || fino <= lettiFino) return
    const id = setTimeout(() => segnaLetti(fino), ATTESA_SPUNTA_MS)
    return () => clearTimeout(id)
  }, [pronti, fino, lettiFino, segnaLetti])

  const { evidenza, altri } = dividiAvvisi(avvisi, lettiAllApertura)
  const tradotto = (avviso: AvvisoSistema): AvvisoSistema => ({ ...avviso, ...testoPerLingua(avviso, lingua) })
  const stato = (avviso: AvvisoSistema) => ({
    letto: avviso.creato <= lettiFino,
    appenaLetto: avviso.creato > lettiAllApertura,
  })

  return (
    <ShellFrame>
      <Header title={frasi.hubAvvisi} backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <AvvisiBetaLista />

        {pronti && avvisi.length === 0 && avvisiBeta.length === 0 ? (
          <div style={{ flex: 1, minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 24 }}>
            <span style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--pri-s)', color: 'var(--pri)', display: 'grid', placeItems: 'center' }}>
              <Bell size={32} strokeWidth={1.8} aria-hidden />
            </span>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{frasi.avsVuoto}</span>
            <span style={{ color: 'var(--tx2)', fontSize: TYPE.rowSub, lineHeight: 1.45, maxWidth: 280 }}>{frasi.avsVuotoTesto}</span>
          </div>
        ) : null}

        {evidenza.map(tradotto).map((avviso) => (
          <article key={avviso.id} aria-label={avviso.titolo} style={{ background: 'var(--bad-s)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--bad)', fontWeight: 700, fontSize: 12, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              <TriangleAlert size={16} strokeWidth={2.2} aria-hidden />
              <span style={{ flex: 1 }}>{frasi.avsTipoImportante}</span>
              <span style={{ color: 'var(--tx2)', fontWeight: 600, letterSpacing: 0, textTransform: 'none' }}>{dataCorta(lingua, new Date(avviso.creato))}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.3 }}>{avviso.titolo}</span>
            {avviso.testo ? <span style={testo}>{avviso.testo}</span> : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
              <span style={{ flex: 1 }} />
              <Spunta {...stato(avviso)} label={frasi.avsLetto} />
            </div>
          </article>
        ))}

        {evidenza.length > 0 && altri.length > 0 ? (
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--tx2)', margin: '6px 2px 0' }}>{frasi.avsAltri}</div>
        ) : null}

        {altri.map(tradotto).map((avviso) => {
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
                  <span style={{ flex: 1 }} />
                  <Spunta letto={letto} appenaLetto={appenaLetto} label={frasi.avsLetto} />
                </div>
              </div>
            </article>
          )
        })}
      </div>

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

const testo: CSSProperties = { fontSize: TYPE.rowSub, color: 'var(--tx2)', lineHeight: 1.45, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }
