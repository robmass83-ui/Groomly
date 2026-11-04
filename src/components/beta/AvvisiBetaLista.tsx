import { ChevronRight, FlaskConical, Hourglass, MessageCircle, type LucideIcon } from 'lucide-react'
import { useEffect, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { dataCorta } from '../../i18n/format'
import type { AvvisoBeta, TipoAvvisoBeta } from '../../lib/avvisiBeta'
import { TYPE } from '../../theme/theme'
import { useBeta } from './BetaProvider'
import { dataBeta, nomePiano, riempi } from './testi'

/** Come per gli avvisi di sistema: il pallino resta un attimo prima di sparire. */
const ATTESA_LETTO_MS = 700

const ICONA: Record<TipoAvvisoBeta, LucideIcon> = {
  invito: FlaskConical,
  promemoria: MessageCircle,
  'fine-vicina': Hourglass,
  'fine-domani': Hourglass,
  finita: Hourglass,
}

const COLORI = {
  pro: { anello: '#7B3FE4', fondo: 'var(--plus-s)', inchiostro: 'var(--plus-ink)' },
  salone: { anello: '#C99200', fondo: 'var(--sal-s)', inchiostro: 'var(--sal-ink)' },
} as const

const testo: CSSProperties = { fontSize: TYPE.rowSub, color: 'var(--tx2)', lineHeight: 1.45, overflowWrap: 'anywhere' }

// Avvisi della beta del salone, in cima alla pagina Avvisi. L'invito resta «nuovo» finché non si apre la sua pagina.
export function AvvisiBetaLista() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const beta = useBeta()
  const { avvisi, letti, segnaLetto } = beta
  const daSegnare = avvisi.filter((avviso) => avviso.tipo !== 'invito' && !letti.has(avviso.id)).map((avviso) => avviso.id).join('|')

  useEffect(() => {
    if (!daSegnare) return
    const id = setTimeout(() => segnaLetto(...daSegnare.split('|')), ATTESA_LETTO_MS)
    return () => clearTimeout(id)
  }, [daSegnare, segnaLetto])

  if (avvisi.length === 0) return null
  const piano = beta.piano ?? 'pro'
  const nome = nomePiano(frasi, piano)
  const colori = COLORI[piano]

  function contenuto(avviso: AvvisoBeta): { titolo: string; corpo?: string; azione: string } {
    if (avviso.tipo === 'invito') {
      const scade = beta.invito ? dataBeta(lingua, new Date(beta.invito.scadeInvitoIl)) : ''
      return {
        titolo: riempi(frasi.betaInvitoAvviso, { piano: nome }),
        corpo: riempi(frasi.betaInvitoTesto, { piano: nome, n: beta.giorniInvito ?? 0, data: scade }),
        azione: frasi.betaApriInvito,
      }
    }
    if (avviso.tipo === 'promemoria') return { titolo: frasi.betaAvvisoPromemoria, azione: frasi.betaFeedbackRiga }
    if (avviso.tipo === 'finita') return { titolo: riempi(frasi.betaFinita, { piano: nome }), azione: riempi(frasi.betaContinuare, { piano: nome }) }
    return {
      titolo: riempi(frasi.betaAvvisoFine, { data: dataBeta(lingua, avviso.data) }),
      azione: avviso.tipo === 'fine-domani' ? riempi(frasi.betaContinuare, { piano: nome }) : frasi.abbTitolo,
    }
  }

  return (
    <>
      {avvisi.map((avviso) => {
        const Icona = ICONA[avviso.tipo]
        const { titolo, corpo, azione } = contenuto(avviso)
        const nuovo = !letti.has(avviso.id)
        const invito = avviso.tipo === 'invito'
        return (
          <article
            key={avviso.id}
            aria-label={titolo}
            data-avviso-beta={avviso.tipo}
            style={{ background: 'var(--card)', borderRadius: 16, boxShadow: invito ? `0 0 0 2px ${colori.anello}, var(--sh-1)` : 'var(--sh-1)', padding: 12, display: 'flex', gap: 12 }}
          >
            <span style={{ width: 38, height: 38, borderRadius: 12, background: colori.fondo, color: colori.inchiostro, display: 'grid', placeItems: 'center', flex: 'none' }}>
              <Icona size={18} strokeWidth={2} aria-hidden />
            </span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: TYPE.meta, fontWeight: 700, color: colori.inchiostro }}>
                <span style={{ flex: 1 }}>
                  {frasi.betaTipoAvviso}
                  {/* Per gli avvisi di fine la data è già nel titolo. */}
                  {avviso.tipo === 'invito' || avviso.tipo === 'promemoria' ? <> · <span style={{ color: 'var(--tx2)', fontWeight: 600 }}>{dataCorta(lingua, avviso.data)}</span></> : null}
                </span>
                {nuovo ? <span data-testid="pallino-beta" aria-hidden style={{ width: 9, height: 9, borderRadius: 5, background: 'var(--bad)', flex: 'none' }} /> : null}
              </span>
              <span style={{ fontWeight: 700, lineHeight: 1.3 }}>{titolo}</span>
              {corpo ? <span style={testo}>{corpo}</span> : null}
              <Link to={avviso.link} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minHeight: 44, alignSelf: 'flex-start', color: colori.inchiostro, fontWeight: 800, fontSize: TYPE.rowSub, textDecoration: 'none' }}>
                {azione}<ChevronRight size={14} strokeWidth={2.6} aria-hidden />
              </Link>
            </div>
          </article>
        )
      })}
    </>
  )
}
