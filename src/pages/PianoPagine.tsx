import { it } from '../i18n/it'

function Pagina({ titolo }: { titolo: string }) {
  return (
    <main style={{ padding: 16 }}>
      <h1>{titolo}</h1>
    </main>
  )
}

export function PianoPage() {
  return <Pagina titolo={it.tuoPiano} />
}

export function TeamPage() {
  return <Pagina titolo={it.team} />
}

export function MessaggiPage() {
  return <Pagina titolo={it.messaggi} />
}

export function StrumentiPage() {
  return <Pagina titolo={it.strumenti} />
}
