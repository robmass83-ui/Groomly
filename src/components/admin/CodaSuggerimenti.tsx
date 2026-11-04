import { Capacitor } from '@capacitor/core'
import { ChevronRight, Star } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Segmented } from '../ui/Segmented'
import { AttesaRiga } from '../ui/Zampette'
import { LIMITE_SUGGERIMENTI, type SuggerimentoArrivato } from '../../data/firebase/client'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import {
  categorieConConteggio,
  contaStati,
  filtraGruppi,
  ordinaPerStato,
  raggruppaSuggerimenti,
  righeEsportazione,
  saloniDelGruppo,
  statoGruppo,
  type FiltroCoda,
  type GruppoSuggerimento,
} from '../../lib/codaSuggerimenti'
import { nomeFileSuggerimenti, pdfSuggerimenti, xlsxSuggerimenti, type BloccoPdf, type RigaExcel } from '../../lib/esportaSuggerimenti'
import type { SegnoSuggerimento } from '../../lib/revisioneSuggerimenti'
import { downloadAnchor, isShareCancel, shareFiles } from '../../lib/shareFile'
import { SIZES } from '../../theme/sizes'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, NOME, RIGA } from './comuni'

type Portata = 'vista' | 'interessante' | 'visto' | 'tutti'
type Formato = 'pdf' | 'xlsx'

export function useEtichettaCategoria(): (id: string) => string {
  const frasi = useFrasi()
  return (id) => {
    const mappa: Record<string, string> = {
      bug: frasi.sugCatBug,
      critica: frasi.sugCatCritica,
      miglioramento: frasi.sugCatMigliora,
      manca: frasi.sugCatManca,
      agenda: frasi.sugCatAgenda,
      animali: frasi.sugCatAnimali,
      listino: frasi.sugCatListino,
      incassi: frasi.sugCatIncassi,
      account: frasi.sugCatAccount,
      lingua: frasi.sugCatLingua,
      altro: frasi.sugCatAltro,
    }
    return mappa[id] ?? id
  }
}

/** Suggerimenti ancora da vedere in tutte le categorie. */
export function suggerimentiDaVedere(note: readonly SuggerimentoArrivato[], segni: Record<string, SegnoSuggerimento>): number {
  const categorie = new Set(note.map((n) => n.categoria))
  let totale = 0
  for (const cat of categorie) totale += contaStati(raggruppaSuggerimenti(note.filter((n) => n.categoria === cat)), segni).nuovo
  return totale
}

/** Elenco delle categorie col numero di suggerimenti. */
export function CategorieSuggerimenti({ note, pronte, onApri }: { note: readonly SuggerimentoArrivato[]; pronte: boolean; onApri: (categoria: string) => void }) {
  const frasi = useFrasi()
  const etichettaCategoria = useEtichettaCategoria()
  if (!pronte) return <AttesaRiga testo={frasi.uteCarica} />
  const categorie = categorieConConteggio([...note])
    .map((voce) => ({ ...voce, etichetta: etichettaCategoria(voce.categoria) }))
    .sort((a, b) => b.totale - a.totale || a.etichetta.localeCompare(b.etichetta, 'it'))
  const dettaglio = note.length >= LIMITE_SUGGERIMENTI
    ? frasi.sugUltimiN.replace('{{n}}', String(LIMITE_SUGGERIMENTI))
    : note.length === 1 ? frasi.sugArrivatoUno : frasi.sugArrivatiN.replace('{{n}}', String(note.length))
  if (categorie.length === 0) return <p style={{ margin: 0 }}>{frasi.sugVuoto}</p>
  return (
    <>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--tx3)' }}>{dettaglio}</p>
      <Card>
        {categorie.map((voce, index) => (
          <button
            key={voce.categoria}
            type="button"
            aria-label={`${voce.etichetta}, ${voce.totale}`}
            onClick={() => onApri(voce.categoria)}
            style={{ ...RIGA, borderTop: index === 0 ? 'none' : RIGA.borderTop, alignItems: 'flex-start' }}
          >
            <span style={{ flex: 1, fontWeight: 600, ...USER_TEXT }}>{voce.etichetta}</span>
            <span aria-hidden style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{voce.totale}</span>
            <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
          </button>
        ))}
      </Card>
    </>
  )
}

/** La coda di una categoria: Da vedere / Interessanti / Visti, stella, «Visto» ed esportazione. */
export function CodaCategoria({
  note,
  categoria,
  segni,
  applica,
  nomeDi,
}: {
  note: readonly SuggerimentoArrivato[]
  categoria: string
  segni: Record<string, SegnoSuggerimento>
  applica: (chiave: string, stato: SegnoSuggerimento | 'nuovo') => void
  nomeDi: (salonId: string) => string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const etichettaCategoria = useEtichettaCategoria()
  const [filtro, setFiltro] = useState<FiltroCoda>('nuovo')
  const [spiegati, setSpiegati] = useState<Record<string, boolean>>({})
  const [esportaAperto, setEsportaAperto] = useState(false)
  const [portata, setPortata] = useState<Portata>('vista')
  const [formato, setFormato] = useState<Formato>('pdf')
  const [esportaErrore, setEsportaErrore] = useState(false)
  const [esportaOccupato, setEsportaOccupato] = useState(false)

  function etichettaStato(stato: FiltroCoda): string {
    if (stato === 'interessante') return frasi.sugInteressanti
    if (stato === 'visto') return frasi.sugVisti
    return frasi.sugDaVedere
  }

  function meta(gruppo: GruppoSuggerimento): string {
    const quanti = gruppo.voci.length === 1 ? frasi.sugUna : frasi.sugTante.replace('{{n}}', String(gruppo.voci.length))
    const saloni = saloniDelGruppo(gruppo).map((id) => nomeDi(id))
    const dove = saloni.length <= 1
      ? (saloni[0] ?? '')
      : frasi.sugEAltri.replace('{{nome}}', saloni[0] ?? '').replace('{{n}}', String(saloni.length - 1))
    const primo = gruppo.voci[0]?.creato
    const quando = primo ? dataCorta(lingua, new Date(primo)) : ''
    return [quanti, dove, quando].filter((parte) => parte !== '').join(' · ')
  }

  function rigaPersona(voce: GruppoSuggerimento['voci'][number]): string {
    const quando = voce.creato ? dataCorta(lingua, new Date(voce.creato)) : ''
    return [voce.email, nomeDi(voce.salonId), quando].filter((parte) => parte !== '').join(' · ')
  }

  const gruppi = raggruppaSuggerimenti(note.filter((nota) => nota.categoria === categoria))
  const visibili = filtraGruppi(gruppi, filtro, segni)
  const conteggi = contaStati(gruppi, segni)

  function gruppiScelti(): GruppoSuggerimento[] {
    if (portata === 'tutti') return gruppi
    if (portata === 'vista') return visibili
    return filtraGruppi(gruppi, portata, segni)
  }

  function righeFile(scelti: readonly GruppoSuggerimento[]): RigaExcel[] {
    return righeEsportazione(scelti, segni).map((riga) => ({
      stato: etichettaStato(riga.stato),
      categoria: etichettaCategoria(riga.categoria),
      testo: riga.testo,
      volte: riga.volte,
      email: riga.email,
      salone: nomeDi(riga.salonId),
      data: riga.creato ? dataCorta(lingua, new Date(riga.creato)) : '',
    }))
  }

  function blocchiFile(scelti: readonly GruppoSuggerimento[]): BloccoPdf[] {
    return ordinaPerStato(scelti, segni).map((gruppo) => ({
      stato: etichettaStato(statoGruppo(gruppo.chiave, segni)),
      testo: gruppo.testo,
      persone: gruppo.voci.map((voce) => rigaPersona(voce)),
    }))
  }

  async function esporta() {
    const scelti = gruppiScelti()
    if (scelti.length === 0 || esportaOccupato) return
    setEsportaOccupato(true)
    setEsportaErrore(false)
    const quando = new Date()
    try {
      const blob = formato === 'pdf'
        ? pdfSuggerimenti(frasi.sugArrivati, blocchiFile(scelti))
        : await xlsxSuggerimenti(
          [frasi.sugStato, frasi.sugCategoria, frasi.sugSuggerimento, frasi.sugVolte, frasi.sugEmail, frasi.sugToelettatura, frasi.sugData],
          righeFile(scelti),
        )
      const nome = nomeFileSuggerimenti(quando, formato)
      if (Capacitor.isNativePlatform()) await shareFiles([{ blob, name: nome }], frasi.sugTitolo)
      else downloadAnchor(blob, nome)
      setEsportaAperto(false)
    } catch (caught) {
      if (!isShareCancel(caught)) setEsportaErrore(true)
    } finally {
      setEsportaOccupato(false)
    }
  }

  const personeScelte = gruppiScelti().reduce((totale, gruppo) => totale + gruppo.voci.length, 0)
  const frasePersone = personeScelte === 1 ? frasi.sugPersona : frasi.sugPersone.replace('{{n}}', String(personeScelte))
  const vuotoCoda = filtro === 'interessante' ? frasi.sugNessunSegno : filtro === 'visto' ? frasi.sugNessunVisto : frasi.sugNiente

  return (
    <>
      <Segmented
        fill
        label={frasi.sugTitolo}
        value={filtro}
        onChange={(valore) => {
          setFiltro(valore)
          setSpiegati({})
        }}
        options={[
          { value: 'nuovo', label: `${frasi.sugDaVedere} ${conteggi.nuovo}` },
          { value: 'interessante', label: `${frasi.sugInteressanti} ${conteggi.interessante}` },
          { value: 'visto', label: `${frasi.sugVisti} ${conteggi.visto}` },
        ]}
      />
      <Button
        variant="secondary"
        style={{ width: '100%' }}
        onClick={() => {
          setPortata('vista')
          setFormato('pdf')
          setEsportaErrore(false)
          setEsportaAperto(true)
        }}
      >
        {frasi.sugEsporta}
      </Button>
      {visibili.length === 0 ? <p style={{ margin: 0 }}>{vuotoCoda}</p> : (
        <Card>
          {visibili.map((gruppo, index) => {
            const interessante = statoGruppo(gruppo.chiave, segni) === 'interessante'
            return (
              <div key={gruppo.chiave} style={{ borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingRight: 4 }}>
                  <button
                    type="button"
                    aria-expanded={spiegati[gruppo.chiave] === true}
                    onClick={() => setSpiegati((current) => ({ ...current, [gruppo.chiave]: current[gruppo.chiave] !== true }))}
                    style={{ ...RIGA, borderTop: 'none', flex: 1, alignItems: 'flex-start' }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={NOME}>{gruppo.testo}</span>
                      <span style={AIUTO}>{meta(gruppo)}</span>
                    </span>
                  </button>
                  <span style={{ display: 'flex', flexDirection: 'column', flex: 'none' }}>
                    <button
                      type="button"
                      aria-pressed={interessante}
                      aria-label={interessante ? frasi.sugTogli : frasi.sugSegna}
                      onClick={() => applica(gruppo.chiave, interessante ? 'nuovo' : 'interessante')}
                      style={{ width: 44, height: 44, border: 0, background: 'transparent', color: interessante ? 'var(--sen)' : 'var(--tx3)', display: 'grid', placeItems: 'center', padding: 0 }}
                    >
                      <Star size={18} strokeWidth={2} fill={interessante ? 'currentColor' : 'none'} aria-hidden />
                    </button>
                    {filtro === 'nuovo' ? (
                      <button
                        type="button"
                        onClick={() => applica(gruppo.chiave, 'visto')}
                        style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--tx2)', font: 'inherit', fontWeight: 600, padding: '8px 10px' }}
                      >
                        {frasi.sugVisto}
                      </button>
                    ) : null}
                  </span>
                </div>
                {spiegati[gruppo.chiave] ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
                    {gruppo.voci.map((voce) => (
                      <span key={voce.id} style={{ fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{rigaPersona(voce)}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </Card>
      )}
      <Dialog open={esportaAperto} title={frasi.sugEsporta} onClose={() => setEsportaAperto(false)}>
        <div role="radiogroup" aria-label={frasi.sugPortata} style={{ display: 'flex', flexDirection: 'column' }}>
          {([
            ['vista', frasi.sugQuelliVista],
            ['interessante', frasi.sugInteressanti],
            ['visto', frasi.sugVisti],
            ['tutti', frasi.sugAncheVisti],
          ] as const).map(([value, label]) => (
            <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44, ...USER_TEXT }}>
              <input type="radio" name="portata-suggerimenti" checked={portata === value} onChange={() => setPortata(value)} />
              {label}
            </label>
          ))}
        </div>
        <Segmented
          fill
          label={frasi.sugFormato}
          value={formato}
          onChange={setFormato}
          options={[{ value: 'pdf', label: frasi.sugPdf }, { value: 'xlsx', label: frasi.sugExcel }]}
        />
        <p style={{ margin: 0 }}>{frasePersone}</p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tx3)', ...USER_TEXT }}>{frasi.sugEsportaNota}</p>
        {esportaErrore ? <p style={{ margin: 0 }}>{frasi.sugEsportaKo}</p> : null}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setEsportaAperto(false)}>{frasi.uteAnnulla}</Button>
          <Button style={{ flex: 1 }} disabled={esportaOccupato || personeScelte === 0} onClick={() => { void esporta() }}>{frasi.sugEsporta}</Button>
        </div>
      </Dialog>
    </>
  )
}
