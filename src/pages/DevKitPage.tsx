import { useState } from 'react'
import { DogAvatar } from '../components/domain/DogAvatar'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { TemperamentIcon } from '../components/domain/TemperamentIcon'
import { Header } from '../components/layout/Header'
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
      </div>
    </PhoneShell>
  )
}
