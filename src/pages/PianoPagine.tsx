import { useFrasi } from '../i18n/LinguaContext'
import { useSettings } from '../hooks/useSettings'
import { strumentoAcceso, type ChiaveStrumento } from '../lib/strumenti'
import { Toggle } from '../components/ui/Toggle'

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
  const { settings, save } = useSettings()
  const righe: { chiave: ChiaveStrumento; etichetta: string }[] = [
    { chiave: 'messaggi', etichetta: frasi.strumMessaggi },
    { chiave: 'affidabilita', etichetta: frasi.strumAffidabilita },
    { chiave: 'noteVocali', etichetta: frasi.strumNoteVocali },
  ]
  const accendi = (chiave: ChiaveStrumento) => {
    save({
      ...settings,
      strumenti: { ...settings.strumenti, [chiave]: !strumentoAcceso(settings, chiave) },
    })
  }
  return (
    <main style={{ padding: 16 }}>
      <h1>{frasi.strumenti}</h1>
      {righe.map((riga) => (
        <div key={riga.chiave} style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 12 }}>
          <span style={{ flex: 1 }}>{riga.etichetta}</span>
          <Toggle checked={strumentoAcceso(settings, riga.chiave)} label={riga.etichetta} onChange={() => accendi(riga.chiave)} />
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 44, gap: 12 }}>
        <span style={{ flex: 1 }}>{frasi.waAuto}</span>
        <span>{frasi.daSviluppare}</span>
      </div>
    </main>
  )
}
