import { useFrasi } from '../i18n/LinguaContext'

function Pagina({ titolo }: { titolo: string }) {
  return (
    <main style={{ padding: 16 }}>
      <h1>{titolo}</h1>
    </main>
  )
}

export function PianoPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.tuoPiano} />
}

export function TeamPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.team} />
}

export function MessaggiPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.messaggi} />
}

export function StrumentiPage() {
  const frasi = useFrasi()
  return <Pagina titolo={frasi.strumenti} />
}
