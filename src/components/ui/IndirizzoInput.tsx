import { Check, MapPin } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { callDettaglioIndirizzo, callSuggerisciIndirizzi, svegliaIndirizzi, type SuggerimentoIndirizzo } from '../../data/firebase/client'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { SIZES } from '../../theme/sizes'
import { TYPE } from '../../theme/theme'
import { Input } from './Input'
import './indirizzoInput.css'

// "Dopo 3 caratteri": con "via" (3) non si cerca ancora, si parte dal quarto
const MIN_CARATTERI = 4
const PAUSA_MS = 300

type Props = {
  label: string
  valore: string
  placeId?: string
  onChange: (next: { indirizzo: string; placeId?: string }) => void
}

export function IndirizzoInput({ label, valore, placeId, onChange }: Props) {
  const t = useFrasi()
  const { lingua } = useLingua()
  const idBase = useId()
  const idLista = `${idBase}-lista`
  const [risultati, setRisultati] = useState<SuggerimentoIndirizzo[] | null>(null)
  const [aperta, setAperta] = useState(false)
  const [attivo, setAttivo] = useState(-1)
  // richiesta partita e risposta non ancora arrivata
  const [cercando, setCercando] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const sessione = useRef<string | null>(null)
  // Ultimo testo chiesto: una risposta per un testo diverso viene scartata.
  const ultimoTesto = useRef('')
  const focus = useRef(false)
  // Testo attuale del campo, per non sovrascrivere ciò che si è scritto mentre il dettaglio arrivava.
  const testoCampo = useRef(valore)

  useEffect(() => { testoCampo.current = valore }, [valore])

  // la funzione si sveglia mentre si scrive, non alla prima ricerca
  useEffect(() => { svegliaIndirizzi() }, [])

  useEffect(() => () => {
    clearTimeout(timer.current)
    ultimoTesto.current = ''
  }, [])

  function chiudi() {
    setAperta(false)
    setAttivo(-1)
  }

  function cerca(testo: string) {
    sessione.current ??= crypto.randomUUID()
    ultimoTesto.current = testo
    setCercando(true)
    setAperta(focus.current)
    void callSuggerisciIndirizzi(testo, sessione.current, lingua).then((lista) => {
      if (ultimoTesto.current !== testo) return
      setCercando(false)
      setRisultati(lista)
      setAttivo(-1)
      // Se il campo ha già perso il focus, la lista non deve riaprirsi.
      setAperta(focus.current)
    })
  }

  function digita(testo: string) {
    testoCampo.current = testo
    onChange({ indirizzo: testo })
    clearTimeout(timer.current)
    if (testo.trim().length < MIN_CARATTERI) {
      ultimoTesto.current = ''
      setRisultati(null)
      setCercando(false)
      chiudi()
      return
    }
    timer.current = setTimeout(() => cerca(testo), PAUSA_MS)
  }

  async function scegli(s: SuggerimentoIndirizzo) {
    clearTimeout(timer.current)
    const token = sessione.current ?? crypto.randomUUID()
    ultimoTesto.current = ''
    setCercando(false)
    chiudi()
    setRisultati(null)
    // subito il testo del suggerimento: "Fatto" premuto prima del dettaglio salva questo
    const provvisorio = [s.principale, s.secondario].filter(Boolean).join(', ')
    testoCampo.current = provvisorio
    onChange({ indirizzo: provvisorio })
    const dettaglio = await callDettaglioIndirizzo(s.placeId, token, lingua)
    sessione.current = null
    if (dettaglio && testoCampo.current === provvisorio) {
      onChange({ indirizzo: dettaglio.indirizzo, placeId: dettaglio.placeId })
    }
  }

  function tasto(e: KeyboardEvent<HTMLInputElement>) {
    const n = risultati?.length ?? 0
    if (e.key === 'Escape') {
      if (aperta) { e.preventDefault(); chiudi() }
    } else if (e.key === 'ArrowDown' && n > 0) {
      e.preventDefault()
      setAperta(true)
      setAttivo((a) => (a + 1) % n)
    } else if (e.key === 'ArrowUp' && n > 0) {
      e.preventDefault()
      setAperta(true)
      setAttivo((a) => (a <= 0 ? n - 1 : a - 1))
    } else if (e.key === 'Enter' && aperta && attivo >= 0 && risultati?.[attivo]) {
      e.preventDefault()
      void scegli(risultati[attivo])
    }
  }

  // durante la ricerca resta la lista di prima, oppure "Cerco…" se non c'è ancora niente
  const listaVisibile = aperta && (risultati !== null || cercando)
  const idRiga = (i: number) => `${idBase}-opt-${i}`

  return (
    <div style={{ position: 'relative' }}>
      <Input
        label={label}
        value={valore}
        placeholder={t.indCerca}
        autoComplete="off"
        icon={<MapPin size={16} />}
        role="combobox"
        aria-expanded={listaVisibile}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={listaVisibile && attivo >= 0 ? idRiga(attivo) : undefined}
        onChange={(e) => digita(e.target.value)}
        onKeyDown={tasto}
        onFocus={() => { focus.current = true; svegliaIndirizzi() }}
        onBlur={() => { focus.current = false; chiudi() }}
      />
      {placeId ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--ok)', fontSize: TYPE.meta }}>
          <Check className="ind-spunta" size={14} aria-hidden />
          {t.indVerificato}
        </span>
      ) : null}
      {listaVisibile ? (
        <div
          id={idLista}
          role="listbox"
          aria-label={label}
          className="ind-lista"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            zIndex: 20,
            background: 'var(--card)',
            border: '1px solid var(--line)',
            boxShadow: 'var(--sh-2)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* tutti i suggerimenti, scorrendo se non entrano */}
          <div style={{ maxHeight: 'min(300px, 45vh)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {risultati === null ? (
              <div role="status" style={{ minHeight: 44, display: 'flex', alignItems: 'center', padding: '8px 12px', color: 'var(--tx2)', fontSize: TYPE.meta }}>
                {t.indCerco}
              </div>
            ) : risultati.length === 0 ? (
              <div
                style={{ minHeight: 44, display: 'flex', alignItems: 'center', padding: '8px 12px', color: 'var(--tx2)', fontSize: TYPE.meta, cursor: 'pointer' }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={chiudi}
              >
                {t.indNonTrovi}
              </div>
            ) : (
              risultati.map((s, i) => (
                <div
                  key={s.placeId}
                  id={idRiga(i)}
                  role="option"
                  aria-selected={i === attivo}
                  className="ind-riga"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void scegli(s)}
                  onMouseEnter={() => setAttivo(i)}
                  style={{ minHeight: 44, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}
                >
                  <MapPin size={16} aria-hidden style={{ color: 'var(--tx3)', flexShrink: 0 }} />
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: SIZES.field.label + 1, color: 'var(--tx)', fontWeight: 600 }}>{s.principale}</span>
                    {s.secondario ? <span style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{s.secondario}</span> : null}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--tx3)', fontSize: TYPE.meta, borderTop: '1px solid var(--line)' }}>
            {t.indGoogle}
          </div>
        </div>
      ) : null}
    </div>
  )
}
