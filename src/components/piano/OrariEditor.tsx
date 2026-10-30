import type { CSSProperties } from 'react'
import { giornoCorto } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { copiaSuTutti, type Fascia, type Giorno, type OrariSettimana } from '../../lib/orari'

const GIORNI: Giorno[] = [1, 2, 3, 4, 5, 6, 0]

// Misure normali e quelle compatte del tour (prototipo: righe da 40px, orari da 82px).
const MISURE = {
  normale: { riga: 48, gap: 8, giorno: 36, giornoFont: undefined, controllo: 44, font: undefined, raggio: 12, padScatto: '0 12px', padOra: '0 8px', larghezzaOra: undefined },
  tour: { riga: 40, gap: 6, giorno: 30, giornoFont: 13, controllo: 36, font: 12, raggio: 8, padScatto: '0 8px', padOra: '0 4px', larghezzaOra: 82 },
} as const

export function OrariEditor({
  mostra,
  orari,
  onChange,
  tour = false,
  titolo,
}: {
  mostra: boolean
  orari: OrariSettimana | undefined
  onChange: (next: OrariSettimana) => void
  /** Nel tour: righe compatte in una card, scatto con rimbalzo e orari che scivolano dentro (classi di tour.css). */
  tour?: boolean
  titolo?: string
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  if (!mostra) return null
  const base: Fascia[] = orari?.[1]?.length ? orari[1] : [{ da: '09:00', a: '18:00' }]
  const m = tour ? MISURE.tour : MISURE.normale

  function scrivi(giorno: Giorno, fasce: Fascia[]) {
    const next: OrariSettimana = { ...orari }
    if (fasce.length === 0) delete next[giorno]
    else next[giorno] = fasce
    onChange(next)
  }

  const ora: CSSProperties = { minHeight: m.controllo, width: m.larghezzaOra, boxSizing: 'border-box', borderRadius: m.raggio, border: `1px solid ${tour ? 'var(--line2)' : 'var(--line)'}`, background: 'var(--card)', color: 'var(--tx)', font: 'inherit', fontSize: m.font, padding: m.padOra }

  const giorni = GIORNI.map((giorno) => {
    const nome = giornoCorto(lingua, giorno)
    const fascia = orari?.[giorno]?.[0]
    const aperto = Boolean(fascia)
    return (
      <div key={giorno} style={{ display: 'flex', alignItems: 'center', gap: m.gap, minHeight: m.riga }}>
        <span style={{ width: m.giorno, flex: 'none', fontWeight: 700, fontSize: m.giornoFont }}>{nome}</span>
        <button
          type="button"
          aria-pressed={aperto}
          className={tour ? 'tour-scatto' : undefined}
          aria-label={`${nome} ${aperto ? frasi.aperto : frasi.chiuso}`}
          onClick={() => scrivi(giorno, aperto ? [] : [{ da: '09:00', a: '18:00' }])}
          style={{
            minHeight: m.controllo,
            minWidth: tour ? 64 : undefined,
            flex: 'none',
            borderRadius: 999,
            border: aperto ? '2px solid var(--pri)' : '1px solid var(--line)',
            background: aperto ? 'var(--pri-s)' : 'var(--surf)',
            color: aperto ? 'var(--pri)' : 'var(--tx2)',
            font: 'inherit',
            fontSize: m.font,
            fontWeight: 700,
            padding: m.padScatto,
          }}
        >
          {aperto ? frasi.aperto : frasi.chiuso}
        </button>
        {fascia ? (
          <>
            <input className={tour ? 'tour-orario' : undefined} aria-label={`${nome} ${frasi.orariDalle}`} type="time" value={fascia.da} onChange={(event) => scrivi(giorno, [{ da: event.target.value, a: fascia.a }])} style={ora} />
            {tour ? <span aria-hidden style={{ color: 'var(--tx3)' }}>–</span> : null}
            <input className={tour ? 'tour-orario' : undefined} aria-label={`${nome} ${frasi.orariAlle}`} type="time" value={fascia.a} onChange={(event) => scrivi(giorno, [{ da: fascia.da, a: event.target.value }])} style={ora} />
          </>
        ) : null}
      </div>
    )
  })

  return (
    <section aria-label={frasi.orariApertura} style={{ display: 'flex', flexDirection: 'column', gap: tour ? 4 : 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={tour ? { margin: 0, flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--tx3)' } : { margin: 0, flex: 1, fontWeight: 700 }}>{titolo ?? frasi.orariApertura}</p>
        <button
          type="button"
          onClick={() => onChange(copiaSuTutti(base))}
          style={{ minHeight: tour ? 36 : 44, borderRadius: tour ? 10 : 12, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--pri)', font: 'inherit', fontSize: tour ? 12 : undefined, fontWeight: 700, padding: tour ? '0 10px' : '0 12px' }}
        >
          {frasi.copiaSuTutti}
        </button>
      </div>
      {tour ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '4px 10px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--sh-1)' }}>
          {giorni}
        </div>
      ) : giorni}
    </section>
  )
}
