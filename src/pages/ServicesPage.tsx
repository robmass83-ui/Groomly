import { useEffect, useState } from 'react'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { useSession } from '../hooks/useSession'
import { useServices } from '../hooks/useServices'
import { summarizeDuration, summarizePrice } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import type { Service, ServiceInput } from '../types/models'
import { ServiceSheet } from './ServiceSheet'

export function ServicesPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useServices(uid)
  const toast = useToast()
  const [editing, setEditing] = useState<Service | 'new' | null>(null)

  useEffect(() => {
    if (api.error) toast.show(api.error, 'plain')
  }, [api.error])

  function submit(input: ServiceInput) {
    const ok = editing === 'new'
      ? api.saveNew(input)
      : editing
        ? api.saveExisting(editing.id, {
          name: input.name,
          durationMin: input.durationMin,
          price: input.price,
          active: input.active,
        })
        : false
    if (ok) {
      toast.show('Salvato', 'ok')
      setEditing(null)
    }
  }

  return (
    <PhoneShell>
      <Header title="Servizi e durate" backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card>
          {api.services.map((service, index) => (
            <Row key={service.id} style={index === 0 ? { borderTop: 'none' } : undefined}>
              <span data-testid={`icon-${service.name}`}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              </span>
              <button type="button" aria-label={`Apri ${service.name}`} onClick={() => setEditing(service)} style={{ flex: 1, textAlign: 'left', border: 0, background: 'transparent', color: service.active ? 'var(--tx)' : 'var(--tx3)', font: 'inherit' }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{service.name}</span>
                <span style={{ color: 'var(--tx2)' }}>{summarizeDuration(service)} · {summarizePrice(service)}</span>
              </button>
              <Chip>{service.kind === 'principale' ? 'Principale' : 'Extra'}</Chip>
              {service.active ? null : <Chip tone="warn">Disattivato</Chip>}
              <button type="button" aria-label={`Sposta su ${service.name}`} disabled={index === 0} onClick={() => api.move(service.id, 'up')}>Su</button>
              <button type="button" aria-label={`Sposta giù ${service.name}`} disabled={index === api.services.length - 1} onClick={() => api.move(service.id, 'down')}>Giù</button>
            </Row>
          ))}
        </Card>
        <Button onClick={() => setEditing('new')}>Aggiungi servizio</Button>
      </div>
      <Sheet
        open={editing !== null}
        title={editing === 'new' ? 'Nuovo servizio' : 'Modifica servizio'}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <ServiceSheet
            mode={editing === 'new' ? 'create' : 'edit'}
            initial={editing === 'new' ? undefined : editing}
            onSubmit={submit}
          />
        ) : null}
      </Sheet>
    </PhoneShell>
  )
}
