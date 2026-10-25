import { giornoCorto } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { copiaSuTutti, type Fascia, type OrariSettimana } from '../../lib/orari'

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
  return (
    <section aria-label={frasi.orariApertura}>
      <p>{frasi.orariApertura}</p>
      <button type="button" onClick={() => onChange(copiaSuTutti(base))}>{frasi.copiaSuTutti}</button>
      <ul>
        {[0, 1, 2, 3, 4, 5, 6].map((giorno) => (
          <li key={giorno}>{giornoCorto(lingua, giorno)}: {(orari?.[giorno as 0] ?? []).map((fascia) => `${fascia.da}–${fascia.a}`).join(', ') || frasi.chiuso}</li>
        ))}
      </ul>
    </section>
  )
}
