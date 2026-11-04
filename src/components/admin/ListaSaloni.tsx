import { Check, ChevronRight, MoreHorizontal } from 'lucide-react'
import { useRef, useState } from 'react'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { FilterChip } from '../ui/FilterChip'
import { SearchBar } from '../ui/SearchBar'
import { StatusPill } from '../ui/StatusPill'
import { AttesaRiga } from '../ui/Zampette'
import { useFrasi } from '../../i18n/LinguaContext'
import {
  fineBetaDi,
  filtraSaloni,
  giorniA,
  nomeSalone,
  soddisfaAttivita,
  type FiltroAttivita,
  type Filtri,
  type RigaLista,
  type StatoBeta,
} from '../../lib/adminManager'
import type { InvitoBeta, StatoInvitoBeta } from '../../lib/betaInvito'
import type { LivelloElenco } from '../../lib/funzioniPiano'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, AvatarSalone, CON_ICONA, MarchioLivello, NOME, RIGA, SFUMATURA_PLUS, SFUMATURA_SALONE } from './comuni'
import { BOTTOM_NAV_CONTENT_PAD } from '../layout/BottomNav'

export type FiltroInvito = 'tutti' | StatoInvitoBeta

const PIANI: LivelloElenco[] = ['base', 'pro', 'salone', 'vip']
const NOMI_PIANO: Record<LivelloElenco, string> = { base: 'Go', pro: 'Plus', salone: 'Salon', vip: 'VIP' }
const PRESSIONE_MS = 500

function alterna<T>(lista: readonly T[], valore: T): T[] {
  return lista.includes(valore) ? lista.filter((v) => v !== valore) : [...lista, valore]
}

/** Lo stato dell'invito che la riga mostra al posto del bollino (null: si mostra il piano). */
function pillolaInvito(riga: RigaLista, invito: InvitoBeta | undefined): { tono: 'prim' | 'bad' | 'neutral' | 'warn'; chiave: 'amStatoInvitato' | 'amStatoRifiutato' | 'amStatoScaduto' | 'amStatoRevocato' | 'amStatoFinita' } | null {
  if (riga.beta === 'invitato') return { tono: 'prim', chiave: 'amStatoInvitato' }
  if (riga.beta !== 'chiuso' || !invito) return null
  if (invito.stato === 'rifiutato') return { tono: 'bad', chiave: 'amStatoRifiutato' }
  if (invito.stato === 'revocato') return { tono: 'warn', chiave: 'amStatoRevocato' }
  if (invito.stato === 'accettato') return { tono: 'neutral', chiave: 'amStatoFinita' }
  return { tono: 'neutral', chiave: 'amStatoScaduto' }
}

export function corrispondeInvito(riga: RigaLista, invito: InvitoBeta | undefined, filtro: FiltroInvito): boolean {
  if (!invito) return false
  if (filtro === 'tutti') return true
  if (filtro === 'invitato') return riga.beta === 'invitato'
  if (filtro === 'accettato') return invito.stato === 'accettato'
  if (filtro === 'scaduto') return invito.stato === 'scaduto' || (invito.stato === 'invitato' && riga.beta === 'chiuso')
  return invito.stato === filtro
}

export function ListaSaloni({
  modo,
  righe,
  pronte,
  errore,
  inviti,
  filtri,
  onFiltri,
  filtroInvito,
  onFiltroInvito,
  conAttivita,
  selezione,
  onSelezione,
  onApri,
  adesso,
}: {
  modo: 'saloni' | 'beta'
  righe: readonly RigaLista[]
  pronte: boolean
  errore: boolean
  inviti: ReadonlyMap<string, InvitoBeta>
  filtri: Filtri
  onFiltri: (filtri: Filtri) => void
  filtroInvito: FiltroInvito
  onFiltroInvito: (filtro: FiltroInvito) => void
  conAttivita: boolean
  selezione: ReadonlySet<string> | null
  onSelezione: (selezione: Set<string> | null) => void
  onApri: (salonId: string) => void
  adesso: Date
}) {
  const frasi = useFrasi()
  const timer = useRef<number | null>(null)
  const premuto = useRef(false)

  if (errore) return <p style={{ margin: 0 }}>{frasi.uteElencoKo}</p>
  if (!pronte) return <AttesaRiga testo={frasi.uteCarica} />

  const visibili = modo === 'saloni'
    ? filtraSaloni(righe, filtri, adesso)
    : filtraSaloni(righe, { ...filtri, piani: [], beta: [], attivita: [] }, adesso).filter((r) => corrispondeInvito(r, inviti.get(r.row.salonId), filtroInvito))

  function conta(prova: (riga: RigaLista) => boolean): number {
    return righe.filter(prova).length
  }

  function sottoriga(riga: RigaLista): string {
    const invito = inviti.get(riga.row.salonId)
    if (riga.beta === 'in-beta') {
      const fine = fineBetaDi(riga.row)
      return frasi.amSottoBeta.replace('{{titolare}}', riga.row.ownerName).replace('{{n}}', String(fine ? giorniA(fine, adesso) : 0))
    }
    if (riga.beta === 'invitato' && invito) {
      return frasi.amSottoInvitato.replace('{{piano}}', invito.piano === 'pro' ? 'Plus' : 'Salon').replace('{{n}}', String(giorniA(invito.scadeInvitoIl, adesso)))
    }
    return [riga.row.ownerName, riga.info.citta].filter(Boolean).join(' · ')
  }

  function alternaSelezione(salonId: string) {
    const prossima = new Set(selezione ?? [])
    if (prossima.has(salonId)) prossima.delete(salonId)
    else prossima.add(salonId)
    onSelezione(prossima)
  }

  function inizioPressione(salonId: string) {
    if (modo !== 'saloni' || selezione) return
    premuto.current = false
    timer.current = window.setTimeout(() => {
      premuto.current = true
      onSelezione(new Set([salonId]))
    }, PRESSIONE_MS)
  }

  function finePressione() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const chipBeta: { valore: StatoBeta; etichetta: string }[] = [
    { valore: 'in-beta', etichetta: frasi.amInBeta },
    { valore: 'invitato', etichetta: frasi.amInvitati },
    { valore: 'mai', etichetta: frasi.amFiltroMaiInvitati },
    { valore: 'chiuso', etichetta: frasi.amFiltroChiusi },
  ]
  const chipAttivita: { valore: FiltroAttivita; etichetta: string }[] = [
    { valore: 'attivi7', etichetta: frasi.amFiltroAttivi7 },
    { valore: 'inattivi', etichetta: frasi.amFiltroInattivi },
  ]
  const chipInvito: { valore: FiltroInvito; etichetta: string }[] = [
    { valore: 'tutti', etichetta: frasi.amTutti },
    { valore: 'invitato', etichetta: frasi.amInvitati },
    { valore: 'accettato', etichetta: frasi.amInBeta },
    { valore: 'rifiutato', etichetta: frasi.amRifiutati },
    { valore: 'scaduto', etichetta: frasi.amScaduti },
    { valore: 'revocato', etichetta: frasi.amRevocati },
  ]

  const conteggio = visibili.length === 1 ? frasi.amUnSalone : frasi.amNSaloni.replace('{{n}}', String(visibili.length))

  return (
    <>
      <SearchBar mode="input" placeholder={frasi.amCerca} value={filtri.testo} onChange={(testo) => onFiltri({ ...filtri, testo })} />
      <div role="group" aria-label={frasi.amFiltri} style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', margin: `0 -${SIZES.pagePadX}px`, padding: `2px ${SIZES.pagePadX}px 4px` }}>
        {modo === 'saloni' ? (
          <>
            {PIANI.map((p) => (
              <span key={p} style={{ flex: 'none' }}>
                <FilterChip pressed={filtri.piani.includes(p)} onClick={() => onFiltri({ ...filtri, piani: alterna(filtri.piani, p) })}>
                  {`${NOMI_PIANO[p]} ${conta((r) => r.livello === p)}`}
                </FilterChip>
              </span>
            ))}
            {chipBeta.map(({ valore, etichetta }) => (
              <span key={valore} style={{ flex: 'none' }}>
                <FilterChip pressed={filtri.beta.includes(valore)} onClick={() => onFiltri({ ...filtri, beta: alterna(filtri.beta, valore) })}>
                  {`${etichetta} ${conta((r) => r.beta === valore)}`}
                </FilterChip>
              </span>
            ))}
            {conAttivita ? chipAttivita.map(({ valore, etichetta }) => (
              <span key={valore} style={{ flex: 'none' }}>
                <FilterChip pressed={filtri.attivita.includes(valore)} onClick={() => onFiltri({ ...filtri, attivita: alterna(filtri.attivita, valore) })}>
                  {`${etichetta} ${conta((r) => soddisfaAttivita(r, valore, adesso))}`}
                </FilterChip>
              </span>
            )) : null}
          </>
        ) : chipInvito.map(({ valore, etichetta }) => (
          <span key={valore} style={{ flex: 'none' }}>
            <FilterChip pressed={filtroInvito === valore} onClick={() => onFiltroInvito(valore)}>
              {`${etichetta} ${conta((r) => corrispondeInvito(r, inviti.get(r.row.salonId), valore))}`}
            </FilterChip>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{conteggio}</span>
        {modo === 'saloni' && visibili.length > 0 ? (
          <button
            type="button"
            onClick={() => onSelezione(new Set(visibili.map((r) => r.row.salonId)))}
            style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontSize: 13, fontWeight: 700, minHeight: 44, padding: '0 4px' }}
          >
            {frasi.amSelezionaTutti}
          </button>
        ) : null}
      </div>
      {visibili.length === 0 ? (
        <p style={{ margin: 0, color: 'var(--tx3)' }}>{righe.length === 0 ? frasi.uteNessuna : modo === 'beta' ? frasi.amNessunInvito : frasi.amNessunSalone}</p>
      ) : (
        <Card>
          {visibili.map((riga, index) => {
            const nome = nomeSalone(riga.row)
            const pillola = pillolaInvito(riga, inviti.get(riga.row.salonId))
            const scelto = selezione?.has(riga.row.salonId) === true
            return (
              <div key={riga.row.salonId} style={{ display: 'flex', alignItems: 'center', borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                {selezione ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={scelto}
                    aria-label={nome}
                    onClick={() => alternaSelezione(riga.row.salonId)}
                    style={{ width: 44, minHeight: 52, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', padding: 0, flex: 'none' }}
                  >
                    <span aria-hidden style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: scelto ? 'var(--pri-solid)' : 'var(--card)', border: scelto ? 0 : '1.5px solid var(--line2)', color: '#fff' }}>
                      {scelto ? <Check size={14} strokeWidth={3} /> : null}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label={`${nome}, ${riga.row.ownerName}`}
                  onClick={() => {
                    if (premuto.current) {
                      premuto.current = false
                      return
                    }
                    if (selezione) alternaSelezione(riga.row.salonId)
                    else onApri(riga.row.salonId)
                  }}
                  onPointerDown={() => inizioPressione(riga.row.salonId)}
                  onPointerUp={finePressione}
                  onPointerLeave={finePressione}
                  onContextMenu={(event) => { if (modo === 'saloni') event.preventDefault() }}
                  style={{ ...RIGA, borderTop: 'none', flex: 1, paddingLeft: selezione ? 0 : SIZES.row.padX }}
                >
                  <AvatarSalone id={riga.row.salonId} nome={nome} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...NOME, fontSize: 14 }}>{nome}</span>
                    <span style={AIUTO}>{sottoriga(riga)}</span>
                  </span>
                  {pillola ? <StatusPill tone={pillola.tono}>{frasi[pillola.chiave]}</StatusPill> : <MarchioLivello livello={riga.livello} />}
                  {selezione ? null : <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />}
                </button>
              </div>
            )
          })}
        </Card>
      )}
    </>
  )
}

/** Barra d'invito in basso durante la selezione. */
export function BarraSelezione({ n, onAnnulla, onInvita, onRegala }: { n: number; onAnnulla: () => void; onInvita: (piano: 'pro' | 'salone') => void; onRegala: () => void }) {
  const frasi = useFrasi()
  const [altro, setAltro] = useState(false)
  return (
    <div className="am-scuro" style={{ position: 'sticky', bottom: `calc(${BOTTOM_NAV_CONTENT_PAD} + 4px)`, zIndex: 6, borderRadius: 16, padding: 10, color: '#fff', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 10px 24px -10px rgba(0,0,0,.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontWeight: 700, ...USER_TEXT }}>{`✓ ${frasi.amSelezionati.replace('{{n}}', String(n))}`}</span>
        <button type="button" onClick={onAnnulla} style={{ border: 0, background: 'transparent', color: '#C9D6EE', font: 'inherit', fontWeight: 700, minHeight: 44, padding: '0 6px' }}>{frasi.uteAnnulla}</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button disabled={n === 0} style={{ flex: 1, background: SFUMATURA_PLUS, color: '#fff', border: 0 }} onClick={() => onInvita('pro')}>{frasi.amBetaPlus}</Button>
        <Button disabled={n === 0} style={{ flex: 1, background: SFUMATURA_SALONE, color: '#3A2700', border: 0 }} onClick={() => onInvita('salone')}>{frasi.amBetaSalone}</Button>
        <Button
          variant="secondary"
          aria-label={frasi.amAltreAzioni}
          disabled={n === 0}
          style={{ ...CON_ICONA, flex: 'none', width: 48, padding: 0 }}
          onClick={() => setAltro(true)}
        >
          <MoreHorizontal size={18} aria-hidden />
        </Button>
      </div>
      <Sheet open={altro} title={frasi.amAltreAzioni} onClose={() => setAltro(false)} closeButton>
        <Button
          variant="secondary"
          style={{ width: '100%' }}
          onClick={() => {
            setAltro(false)
            onRegala()
          }}
        >
          {frasi.amRegalaTutti}
        </Button>
      </Sheet>
    </div>
  )
}
