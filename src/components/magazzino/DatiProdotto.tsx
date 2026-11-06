import { Plus } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { t } from '../../i18n/t'
import { normalizeSearch } from '../../lib/normalizza'
import { CATEGORIE_SCELTA, FORMATI_PROPOSTI, fornitori, leggiQuantita, misura, muoviProdotto, type CategoriaProdotto, type Prodotto, type UnitaProdotto } from '../../lib/prodotti'
import { SIZES } from '../../theme/sizes'
import { Dialog } from '../layout/Dialog'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Segmented } from '../ui/Segmented'
import { Contatore } from './Contatore'
import { ETICHETTA_CATEGORIA, chipMagazzino } from './categorie'

export interface BozzaProdotto {
  nome: string
  categoria: CategoriaProdotto
  quantita: number | null
  unita: UnitaProdotto
  /** Il nome e la categoria si scrivono a mano. */
  libero: boolean
}

type Formato = { quantita: number; unita: UnitaProdotto } | null

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
  const [erroreNome, setErroreNome] = useState<string>()
  const [erroreAltra, setErroreAltra] = useState<string>()
  const [contatti, setContatti] = useState<{ nome: string; telefono: string; email: string } | null>(null)
  const [erroreDitta, setErroreDitta] = useState<string>()

  function scegliFornitore(nomeDitta: string) {
    const scelto = noti.find((item) => item.nome === nomeDitta)
    setDitta(nomeDitta)
    setTelefono(scelto?.telefono ?? '')
    setEmail(scelto?.email ?? '')
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
    setContatti(null)
    setErroreDitta(undefined)
  }

  function onSalva() {
    const letta = altra.trim() ? leggiQuantita(altra) : null
    const nomeOk = nome.trim().length > 0
    setErroreNome(nomeOk ? undefined : frasi.magNomeManca)
    setErroreAltra(letta === 'errore' ? frasi.magQuantitaErrore : undefined)
    if (!nomeOk || letta === 'errore') return
    const finale: Formato = letta === null ? formato : { quantita: letta, unita: unitaAltra }
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
      createdAt: esistente?.createdAt ?? adesso,
      updatedAt: adesso,
    }
    const prodotto = esistente ? base : muoviProdotto(base, pezzi, adesso)
    void save(prodotto)
    // I contatti valgono per tutto il fornitore.
    const chiave = normalizeSearch(prodotto.ditta)
    for (const altro of prodotti) {
      if (altro.id !== prodotto.id && chiave && normalizeSearch(altro.ditta) === chiave && (altro.telefono !== telefono || altro.email !== email)) {
        void save({ ...altro, telefono, email, updatedAt: adesso })
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
            <button type="button" onClick={() => setContatti({ nome: '', telefono: '', email: '' })} style={{ ...chipMagazzino(false), display: 'inline-flex', alignItems: 'center', gap: 6 }}><Plus size={14} strokeWidth={2} aria-hidden />{frasi.magNuovoFornitoreBreve}</button>
            {ditta ? <button type="button" onClick={() => setContatti({ nome: ditta, telefono, email })} style={chipMagazzino(false)}>{frasi.magContatti}</button> : null}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'end' }}>
          <Input label={frasi.magCampoCodice} value={codice} onChange={(event) => setCodice(event.target.value)} maxLength={120} autoComplete="off" />
          <div>
            <span style={etichetta}>{frasi.magAvvisami}</span>
            <Contatore etichetta={frasi.magAvvisami} valore={soglia} onChange={setSoglia} />
          </div>
        </div>
      </div>
      {contatti ? (
        <Dialog open portal title={frasi.magNuovoFornitore} onClose={() => setContatti(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input label={frasi.magFornitoreNome} value={contatti.nome} onChange={(event) => setContatti({ ...contatti, nome: event.target.value })} error={erroreDitta} maxLength={120} />
            <Input label={frasi.magFornitoreTelefono} value={contatti.telefono} onChange={(event) => setContatti({ ...contatti, telefono: event.target.value })} inputMode="tel" maxLength={120} />
            <Input label={frasi.magFornitoreEmail} value={contatti.email} onChange={(event) => setContatti({ ...contatti, email: event.target.value })} inputMode="email" maxLength={120} />
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
