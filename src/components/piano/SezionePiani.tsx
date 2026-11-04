import { Link } from 'react-router-dom'
import { hrefVoce, vociMenuPiani } from '../../lib/vociMenu'
import type { Livello } from '../../lib/piano'
import { PianoCard } from './PianoCard'
import { frase } from '../../i18n/frase'

export function SezionePiani({
  mostraPiani,
  collaboratore,
  livello,
  provaUsata,
  onProva,
}: {
  mostraPiani: boolean
  collaboratore: boolean
  livello: Livello
  provaUsata: boolean
  onProva: () => void
}) {
  const visibile = mostraPiani && !collaboratore
  return (
    <>
      {visibile ? <PianoCard livello={livello} provaUsata={provaUsata} onProva={onProva} onApri={() => undefined} /> : null}
      {vociMenuPiani(visibile).map((voce) => (
        <Link key={voce} to={hrefVoce(voce)}>{frase(voce)}</Link>
      ))}
    </>
  )
}
