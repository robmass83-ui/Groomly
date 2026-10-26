import { giornoCorto } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { copiaSuTutti, type Fascia, type Giorno, type OrariSettimana } from '../../lib/orari'

const GIORNI: Giorno[] = [1, 2, 3, 4, 5, 6, 0]

export function OrariEditor({
  mostra,
  orari,
  onChange,
}: {
  mostra: boolean
  orari: OrariSettimana | undefined
  onChange: (next: OrariSettimana) => void
}) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  if (!mostra) return null
  const base: Fascia[] = orari?.[1]?.length ? orari[1] : [{ da: '09:00', a: '18:00' }]

  function scrivi(giorno: Giorno, fasce: Fascia[]) {
    const next: OrariSettimana = { ...orari }
    if (fasce.length === 0) delete next[giorno]
    else next[giorno] = fasce
    onChange(next)
  }

  return (
    <section aria-label={frasi.orariApertura} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, flex: 1, fontWeight: 700 }}>{frasi.orariApertura}</p>
        <button type="button" onClick={() => onChange(copiaSuTutti(base))} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '0 12px' }}>{frasi.copiaSuTutti}</button>
      </div>
      {GIORNI.map((giorno) => {
        const nome = giornoCorto(lingua, giorno)
        const fascia = orari?.[giorno]?.[0]
        const aperto = Boolean(fascia)
        return (
          <div key={giorno} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48 }}>
            <span style={{ width: 36, fontWeight: 700 }}>{nome}</span>
            <button
              type="button"
              aria-pressed={aperto}
              aria-label={`${nome} ${aperto ? frasi.aperto : frasi.chiuso}`}
              onClick={() => scrivi(giorno, aperto ? [] : [{ da: '09:00', a: '18:00' }])}
              style={{
                minHeight: 44,
                borderRadius: 999,
                border: aperto ? '2px solid var(--pri)' : '1px solid var(--line)',
                background: aperto ? 'var(--pri-s)' : 'var(--surf)',
                color: aperto ? 'var(--pri)' : 'var(--tx2)',
                font: 'inherit',
                fontWeight: 700,
                padding: '0 12px',
              }}
            >
              {aperto ? frasi.aperto : frasi.chiuso}
            </button>
            {fascia ? (
              <>
                <input aria-label={`${nome} ${frasi.orariDalle}`} type="time" value={fascia.da} onChange={(event) => scrivi(giorno, [{ da: event.target.value, a: fascia.a }])} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', font: 'inherit', padding: '0 8px' }} />
                <input aria-label={`${nome} ${frasi.orariAlle}`} type="time" value={fascia.a} onChange={(event) => scrivi(giorno, [{ da: fascia.da, a: event.target.value }])} style={{ minHeight: 44, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', font: 'inherit', padding: '0 8px' }} />
              </>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}
