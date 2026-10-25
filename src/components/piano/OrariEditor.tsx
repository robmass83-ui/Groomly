import { it } from '../../i18n/it'
import { copiaSuTutti, type Fascia, type OrariSettimana } from '../../lib/orari'

const ETICHETTE = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export function OrariEditor({
  mostra,
  orari,
  onChange,
}: {
  mostra: boolean
  orari: OrariSettimana | undefined
  onChange: (next: OrariSettimana) => void
}) {
  if (!mostra) return null
  const base: Fascia[] = orari?.[1]?.length ? orari[1] : [{ da: '09:00', a: '18:00' }]
  return (
    <section aria-label={it.orariApertura}>
      <p>{it.orariApertura}</p>
      <button type="button" onClick={() => onChange(copiaSuTutti(base))}>{it.copiaSuTutti}</button>
      <ul>
        {ETICHETTE.map((nome, giorno) => (
          <li key={nome}>{nome}: {(orari?.[giorno as 0] ?? []).map((fascia) => `${fascia.da}–${fascia.a}`).join(', ') || it.chiuso}</li>
        ))}
      </ul>
    </section>
  )
}
