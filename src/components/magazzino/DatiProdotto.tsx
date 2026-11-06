import { ChevronDown, Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { usePlus } from '../../hooks/usePlus'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { TAGLIE } from '../../lib/dogList'
import { normalizeSearch } from '../../lib/normalizza'
import { CATEGORIE_SCELTA, DETTAGLI_VUOTI, FORMATI_PROPOSTI, fornitori, leggiQuantita, misura, muoviProdotto, type CategoriaProdotto, type ConsumoPerTaglia, type Prodotto, type UnitaProdotto } from '../../lib/prodotti'
import { SIZES } from '../../theme/sizes'
import type { DogSize } from '../../types/models'
import { Dialog } from '../layout/Dialog'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Segmented } from '../ui/Segmented'
import { Toggle } from '../ui/Toggle'
import { Contatore } from './Contatore'
import { ETICHETTA_CATEGORIA, chipMagazzino } from './categorie'

export interface BozzaProdotto {
  nome: string
  categoria: CategoriaProdotto
  quantita: number | null
  unita: UnitaProdotto
  /** Il nome e la categoria si scrivono a mano. */
  libero: boolean
  diluizione?: number | null
  mlPerCane?: ConsumoPerTaglia | null
}

type Formato = { quantita: number; unita: UnitaProdotto } | null

const ETICHETTA_TAGLIA = { piccola: 'servPiccola', media: 'servMedia', grande: 'servGrande' } as const

function testoNumero(valore: number | null | undefined, lingua: string): string {
  return valore === null || valore === undefined ? '' : new Intl.NumberFormat(lingua, { useGrouping: false }).format(valore)
}

const etichetta: CSSProperties = { display: 'block', marginBottom: 6, fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }

function tastoFormato(attivo: boolean): CSSProperties {
  return {
    minHeight: 44,
    padding: 0,
    borderRadius: 10,
    border: `1px solid ${attivo ? 'var(--pri-solid)' : 'var(--line)'}`,
    background: attivo ? 'var(--pri-solid)' : 'var(--card)',
    color: attivo ? 'var(--on-pri)' : 'var(--tx)',
    font: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  }
}

function stessoFormato(a: Formato, b: Formato): boolean {
  return a?.quantita === b?.quantita && (a === null || a.unita === b?.unita)
}

export function DatiProdotto({ bozza, esistente, prodotti, onClose, save, onSalvato }: {
  bozza: BozzaProdotto
  esistente?: Prodotto
  prodotti: Prodotto[]
  onClose: () => void
  save: (prodotto: Prodotto) => Promise<void>
  onSalvato: () => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const stime = usePlus('stimeMagazzino')
  const noti = fornitori(prodotti)
  const propostoIniziale: Formato = bozza.quantita === null ? null : { quantita: bozza.quantita, unita: bozza.unita }
  const inElenco = propostoIniziale === null || FORMATI_PROPOSTI.some((item) => stessoFormato(item, propostoIniziale))
  const [nome, setNome] = useState(bozza.nome)
  const [categoria, setCategoria] = useState(bozza.categoria)
  const [pezzi, setPezzi] = useState(1)
  const [formato, setFormato] = useState<Formato>(inElenco ? propostoIniziale : null)
  const [altra, setAltra] = useState(inElenco || !propostoIniziale ? '' : new Intl.NumberFormat(lingua, { useGrouping: false }).format(propostoIniziale.quantita))
  const [unitaAltra, setUnitaAltra] = useState<UnitaProdotto>(bozza.unita)
  const [ditta, setDitta] = useState(esistente?.ditta ?? noti[0]?.nome ?? '')
  const [telefono, setTelefono] = useState(esistente?.telefono ?? noti[0]?.telefono ?? '')
  const [email, setEmail] = useState(esistente?.email ?? noti[0]?.email ?? '')
  const [codice, setCodice] = useState(esistente?.codice ?? '')
  const [soglia, setSoglia] = useState(esistente?.soglia ?? 2)
  const [giorniConsegna, setGiorniConsegna] = useState(esistente?.giorniConsegna ?? noti[0]?.giorniConsegna ?? null)
  const [dettagli, setDettagli] = useState(false)
  const [inVendita, setInVendita] = useState(esistente?.uso === 'vendita')
  const [diluizione, setDiluizione] = useState((esistente ? esistente.diluizione : bozza.diluizione) ?? 0)
  const [mesi, setMesi] = useState(esistente?.mesiDopoApertura ?? 0)
  const [costo, setCosto] = useState(testoNumero(esistente?.costo, lingua))
  const [prezzo, setPrezzo] = useState(testoNumero(esistente?.prezzoVendita, lingua))
  const consumoIniziale = esistente ? esistente.mlPerCane : bozza.mlPerCane
  const [consumo, setConsumo] = useState<Record<DogSize, string>>({
    piccola: testoNumero(consumoIniziale?.piccola, lingua),
    media: testoNumero(consumoIniziale?.media, lingua),
    grande: testoNumero(consumoIniziale?.grande, lingua),
  })
  const [erroreDettagli, setErroreDettagli] = useState<'costo' | 'prezzo' | 'consumo'>()
  const [erroreNome, setErroreNome] = useState<string>()
  const [erroreAltra, setErroreAltra] = useState<string>()
  const [contatti, setContatti] = useState<{ nome: string; telefono: string; email: string; giorni: number } | null>(null)
  const [erroreDitta, setErroreDitta] = useState<string>()

  function scegliFornitore(nomeDitta: string) {
    const scelto = noti.find((item) => item.nome === nomeDitta)
    setDitta(nomeDitta)
    setTelefono(scelto?.telefono ?? '')
    setEmail(scelto?.email ?? '')
    setGiorniConsegna(scelto?.giorniConsegna ?? null)
  }

  function salvaContatti() {
    if (!contatti) return
    if (!contatti.nome.trim()) {
      setErroreDitta(frasi.magFornitoreManca)
      return
    }
    setDitta(contatti.nome.trim())
    setTelefono(contatti.telefono.trim())
    setEmail(contatti.email.trim())
    setGiorniConsegna(contatti.giorni > 0 ? contatti.giorni : null)
    setContatti(null)
    setErroreDitta(undefined)
  }

  /** Tre campi vuoti sono «niente stima», due su tre sono un errore. */
  function leggiConsumo(): ConsumoPerTaglia | null | 'errore' {
    const [piccola, media, grande] = TAGLIE.map((taglia) => leggiQuantita(consumo[taglia]))
    if (piccola === null && media === null && grande === null) return null
    return typeof piccola === 'number' && typeof media === 'number' && typeof grande === 'number' ? { piccola, media, grande } : 'errore'
  }

  function onSalva() {
    const letta = altra.trim() ? leggiQuantita(altra) : null
    const nomeOk = nome.trim().length > 0
    setErroreNome(nomeOk ? undefined : frasi.magNomeManca)
    setErroreAltra(letta === 'errore' ? frasi.magQuantitaErrore : undefined)
    if (!nomeOk || letta === 'errore') return
    const finale: Formato = letta === null ? formato : { quantita: letta, unita: unitaAltra }
    const conConsumo = (categoria === 'lavaggio' || categoria === 'finitura') && finale !== null
    const costoLetto = leggiQuantita(costo)
    const prezzoLetto = inVendita ? leggiQuantita(prezzo) : null
    const consumoLetto = stime.accesso ? leggiConsumo() : consumoIniziale ?? null
    const errore = costoLetto === 'errore' ? 'costo' : prezzoLetto === 'errore' ? 'prezzo' : conConsumo && consumoLetto === 'errore' ? 'consumo' : undefined
    setErroreDettagli(errore)
    if (errore) {
      setDettagli(true)
      return
    }
    const adesso = new Date()
    const base: Prodotto = {
      id: esistente?.id ?? crypto.randomUUID(),
      nome: nome.trim(),
      categoria,
      pezzi: esistente?.pezzi ?? 0,
      quantita: finale?.quantita ?? null,
      unita: finale?.unita ?? 'l',
      ditta: ditta.trim(),
      telefono,
      email,
      codice: codice.trim(),
      soglia,
      inArrivo: esistente?.inArrivo ?? 0,
      ordinatoIl: esistente?.ordinatoIl ?? null,
      movimenti: esistente?.movimenti ?? [],
      ...DETTAGLI_VUOTI,
      apertoIl: esistente?.apertoIl ?? null,
      confrontoIl: esistente?.confrontoIl ?? null,
      uso: inVendita ? 'vendita' : 'salone',
      diluizione: categoria === 'lavaggio' && diluizione > 0 ? diluizione : null,
      mesiDopoApertura: mesi > 0 ? mesi : null,
      costo: costoLetto as number | null,
      prezzoVendita: prezzoLetto as number | null,
      mlPerCane: conConsumo ? consumoLetto as ConsumoPerTaglia | null : null,
      giorniConsegna,
      createdAt: esistente?.createdAt ?? adesso,
      updatedAt: adesso,
    }
    const prodotto = esistente ? base : muoviProdotto(base, pezzi, adesso)
    void save(prodotto)
    // I contatti valgono per tutto il fornitore.
    const chiave = normalizeSearch(prodotto.ditta)
    for (const altro of prodotti) {
      if (altro.id !== prodotto.id && chiave && normalizeSearch(altro.ditta) === chiave && (altro.telefono !== telefono || altro.email !== email || altro.giorniConsegna !== giorniConsegna)) {
        void save({ ...altro, telefono, email, giorniConsegna, updatedAt: adesso })
      }
    }
    onSalvato()
  }

  return (
    <Sheet
      open
      closeButton
      title={bozza.libero ? frasi.magNuovo : nome}
      onClose={onClose}
      footer={<Button type="button" size="lg" onClick={onSalva} style={{ width: '100%' }}>{esistente ? frasi.magSalva : pezzi === 1 ? frasi.magAggiungiUno : t(lingua, 'magAggiungiPezzi', { n: pezzi })}</Button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
        {bozza.libero ? (
          <>
            <Input label={frasi.magCampoProdotto} value={nome} onChange={(event) => setNome(event.target.value)} error={erroreNome} maxLength={120} />
            <div role="radiogroup" aria-label={frasi.magCampoCategoria} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(categoria === 'varie' ? [...CATEGORIE_SCELTA, categoria] : CATEGORIE_SCELTA).map((item) => (
                <button key={item} type="button" role="radio" aria-checked={categoria === item} onClick={() => setCategoria(item)} style={chipMagazzino(categoria === item)}>{frasi[ETICHETTA_CATEGORIA[item]]}</button>
              ))}
            </div>
          </>
        ) : null}
        {esistente ? null : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...etichetta, marginBottom: 0 }}>{frasi.magQuantiPezzi}</span>
            <Contatore etichetta={frasi.magQuantiPezzi} valore={pezzi} onChange={setPezzi} min={1} />
          </div>
        )}
        <div>
          <span style={etichetta}>{frasi.magContenuto}</span>
          <div role="radiogroup" aria-label={frasi.magContenuto} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
            {FORMATI_PROPOSTI.map((item) => {
              const attivo = !altra.trim() && stessoFormato(formato, item)
              return (
                <button key={`${item.quantita}${item.unita}`} type="button" role="radio" aria-checked={attivo} onClick={() => { setFormato(item); setAltra('') }} style={tastoFormato(attivo)}>
                  {misura(item.quantita, item.unita, lingua)}
                </button>
              )
            })}
          </div>
          <button type="button" role="radio" aria-checked={!altra.trim() && formato === null} onClick={() => { setFormato(null); setAltra('') }} style={{ ...tastoFormato(!altra.trim() && formato === null), width: '100%', marginTop: 6 }}>{frasi.magSenzaFormato}</button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 8, alignItems: 'end' }}>
            <Input label={frasi.magAltraMisura} value={altra} onChange={(event) => setAltra(event.target.value)} error={erroreAltra} inputMode="decimal" />
            <Segmented fill label={frasi.magCampoUnita} value={unitaAltra} onChange={setUnitaAltra} options={[{ value: 'l', label: frasi.magLitri }, { value: 'ml', label: 'ml' }]} />
          </div>
        </div>
        <div>
          <span style={etichetta}>{frasi.magCampoDitta}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {noti.map((item) => (
              <button key={item.nome} type="button" aria-pressed={normalizeSearch(ditta) === normalizeSearch(item.nome)} onClick={() => scegliFornitore(item.nome)} style={chipMagazzino(normalizeSearch(ditta) === normalizeSearch(item.nome))}>{item.nome}</button>
            ))}
            {ditta && !noti.some((item) => normalizeSearch(item.nome) === normalizeSearch(ditta)) ? <button type="button" aria-pressed style={chipMagazzino(true)}>{ditta}</button> : null}
            <button type="button" onClick={() => setContatti({ nome: '', telefono: '', email: '', giorni: 0 })} style={{ ...chipMagazzino(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={14} strokeWidth={2} aria-hidden />{frasi.magNuovoFornitoreBreve}</button>
            {ditta ? <button type="button" onClick={() => setContatti({ nome: ditta, telefono, email, giorni: giorniConsegna ?? 0 })} style={chipMagazzino(false)}>{frasi.magContatti}</button> : null}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
          <Input label={frasi.magCampoCodice} value={codice} onChange={(event) => setCodice(event.target.value)} maxLength={120} autoComplete="off" />
          <div>
            <span style={etichetta}>{frasi.magAvvisami}</span>
            <Contatore etichetta={frasi.magAvvisami} valore={soglia} onChange={setSoglia} />
          </div>
        </div>
        <button type="button" aria-expanded={dettagli} onClick={() => setDettagli(!dettagli)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, padding: 0, border: 0, background: 'transparent', color: 'var(--tx2)', font: 'inherit', fontWeight: 600, cursor: 'pointer' }}>
          {frasi.magAltriDettagli}
          <ChevronDown size={16} strokeWidth={2} aria-hidden style={{ transform: dettagli ? 'rotate(180deg)' : undefined }} />
        </button>
        {dettagli ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...etichetta, marginBottom: 0 }}>{frasi.magLoVendo}</span>
                <Toggle label={frasi.magLoVendo} checked={inVendita} onChange={setInVendita} />
              </div>
              <small style={{ color: 'var(--tx3)' }}>{frasi.magLoVendoNota}</small>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
              <Input label={frasi.magCampoCosto} value={costo} onChange={(event) => setCosto(event.target.value)} error={erroreDettagli === 'costo' ? frasi.magNumeroErrore : undefined} inputMode="decimal" />
              {inVendita ? <Input label={frasi.magCampoPrezzoVendita} value={prezzo} onChange={(event) => setPrezzo(event.target.value)} error={erroreDettagli === 'prezzo' ? frasi.magNumeroErrore : undefined} inputMode="decimal" /> : null}
            </div>
            {categoria === 'lavaggio' ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ ...etichetta, marginBottom: 0 }}>{frasi.magCampoDiluizione}</span>
                <Contatore etichetta={frasi.magCampoDiluizione} valore={diluizione} onChange={setDiluizione} />
              </div>
            ) : null}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ ...etichetta, marginBottom: 0 }}>{frasi.magCampoMesi}</span>
              <Contatore etichetta={frasi.magCampoMesi} valore={mesi} onChange={setMesi} />
            </div>
            {stime.accesso && (categoria === 'lavaggio' || categoria === 'finitura') && (formato !== null || altra.trim()) ? (
              <div>
                <span style={etichetta}>{frasi.magCampoConsumo}</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {TAGLIE.map((taglia) => (
                    <Input key={taglia} label={frasi[ETICHETTA_TAGLIA[taglia]]} value={consumo[taglia]} onChange={(event) => setConsumo({ ...consumo, [taglia]: event.target.value })} inputMode="decimal" />
                  ))}
                </div>
                <small style={{ color: erroreDettagli === 'consumo' ? 'var(--bad)' : 'var(--tx3)' }}>{erroreDettagli === 'consumo' ? frasi.magNumeroErrore : frasi.magStimaNota}</small>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {contatti ? (
        <Dialog open portal title={frasi.magNuovoFornitore} onClose={() => setContatti(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input label={frasi.magFornitoreNome} value={contatti.nome} onChange={(event) => setContatti({ ...contatti, nome: event.target.value })} error={erroreDitta} maxLength={120} />
            <Input label={frasi.magFornitoreTelefono} value={contatti.telefono} onChange={(event) => setContatti({ ...contatti, telefono: event.target.value })} inputMode="tel" maxLength={120} />
            <Input label={frasi.magFornitoreEmail} value={contatti.email} onChange={(event) => setContatti({ ...contatti, email: event.target.value })} inputMode="email" maxLength={120} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ ...etichetta, marginBottom: 0 }}>{frasi.magFornitoreConsegna}</span>
              <Contatore etichetta={frasi.magFornitoreConsegna} valore={contatti.giorni} onChange={(giorni) => setContatti({ ...contatti, giorni })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button type="button" variant="ghost" onClick={() => setContatti(null)}>{frasi.homeAnnulla}</Button>
              <Button type="button" onClick={salvaContatti}>{frasi.magFornitoreSalva}</Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </Sheet>
  )
}
