import { useState, type CSSProperties } from 'react'
import { Cloud, Clock, ImageIcon, ReceiptEuro, Scissors } from 'lucide-react'
import { DogAvatar } from '../components/domain/DogAvatar'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
import { Mascotte } from '../components/tour/Mascotte'
import { TourAnello, TourFesta, TourIllustrazione, TourPulsante, TourTappe, TourTestata } from '../components/tour/TourScena'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { Button } from '../components/ui/Button'
import { Chip } from '../components/ui/Chip'
import { SearchBar } from '../components/ui/SearchBar'
import { Toggle } from '../components/ui/Toggle'
import { SERVICE_ICON_KEYS } from '../types/models'

export function DevKitPage() {
  const [open, setOpen] = useState(false)
  const [on, setOn] = useState(true)
  const [festa, setFesta] = useState(0)
  const [pronto, setPronto] = useState(false)
  const [giro, setGiro] = useState(0)
  return (
    <PhoneShell>
      <Header title="Kit" backTo="/" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <SearchBar />
        <Chip tone="ok">Selezionato</Chip>
        <Toggle label="Attivo" checked={on} onChange={setOn} />
        <DogAvatar alt="Foto mancante" size="md" />
        <div style={{ display: 'flex', gap: 8 }}>
          <TemperamentIcon kind="bravo" size={25} />
          <TemperamentIcon kind="agitato" size={25} />
          <TemperamentIcon kind="mordace" size={25} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SERVICE_ICON_KEYS.map((key) => <ServiceIcon key={key} iconKey={key} size={19} />)}
        </div>
        <Button onClick={() => setOpen(true)}>Apri foglio</Button>
        <Sheet open={open} title="Foglio di prova" onClose={() => setOpen(false)}><p>Prova</p></Sheet>

        <h2 style={{ fontSize: 17, margin: '12px 0 0' }}>Tour</h2>
        <div key={giro} data-testid="kit-tour" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><Mascotte size={170} /></div>
          <div className="tour-cascata" style={{ '--i': 0 } as CSSProperties}><TourTestata n={2} m={5} /></div>
          <div className="tour-cascata" style={{ '--i': 1 } as CSSProperties}><TourIllustrazione tono="logo" icona={ImageIcon} /></div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <TourIllustrazione tono="sede" icona={Clock} compatta />
            <TourIllustrazione tono="listino" icona={Scissors} compatta />
            <TourIllustrazione tono="backup" icona={Cloud} compatta />
            <TourIllustrazione tono="fiscale" icona={ReceiptEuro} compatta />
          </div>
          <TourTappe attiva={1} />
          <TourTappe attiva={2} />
          <TourPulsante pronto={pronto} disabled={!pronto} onClick={() => setFesta((f) => f + 1)}>Fatto, avanti</TourPulsante>
          <Toggle label="Campi pronti" checked={pronto} onChange={setPronto} />
          <TourAnello fatti={4} tutti={6} />
          <Button variant="secondary" onClick={() => setGiro((g) => g + 1)}>Rifai le entrate</Button>
          <Button variant="secondary" onClick={() => setFesta((f) => f + 1)}>Rivedi la festa</Button>
        </div>
        {festa > 0 ? <TourFesta key={festa} titolo="Logo: fatto!" onFine={() => setFesta(0)} /> : null}
      </div>
    </PhoneShell>
  )
}
