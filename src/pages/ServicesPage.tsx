import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { GripVertical } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Dialog } from '../components/layout/Dialog'
import { useToast } from '../components/layout/Toast'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { SectionHeader } from '../components/ui/SectionTitle'
import { StatusPill } from '../components/ui/StatusPill'
import { Toggle } from '../components/ui/Toggle'
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
  const dragFrom = useRef<{ id: string; index: number } | null>(null)

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

  function moveInKind(id: string, toIndex: number) {
    api.reorderKind(id, toIndex)
  }

  function onHandleKey(service: Service, index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveInKind(service.id, index + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveInKind(service.id, index - 1)
    }
  }

  function onHandlePointerDown(event: PointerEvent<HTMLButtonElement>, service: Service, index: number) {
    dragFrom.current = { id: service.id, index }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function onHandlePointerUp(event: PointerEvent<HTMLButtonElement>, service: Service) {
    const from = dragFrom.current
    dragFrom.current = null
    if (!from || from.id !== service.id) return
    const section = event.currentTarget.closest('[data-kind]')
    const rows = section ? Array.from(section.querySelectorAll('[data-service-row]')) : []
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const row = hit instanceof Element ? hit.closest('[data-service-row]') : null
    const toIndex = row ? rows.indexOf(row) : -1
    if (toIndex < 0) return
    moveInKind(service.id, toIndex)
  }

  function renderGroup(title: string, kind: Service['kind'], list: Service[]) {
    return (
      <section data-kind={kind} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SectionHeader count={list.length}>{title}</SectionHeader>
        <Card>
          {list.map((service, index) => (
            <Row
              key={service.id}
              data-service-row=""
              style={{
                borderTop: index === 0 ? 'none' : undefined,
                opacity: service.active ? undefined : 0.72,
              }}
            >
              <button
                type="button"
                aria-label={`Riordina ${service.name}`}
                onKeyDown={(event) => onHandleKey(service, index, event)}
                onPointerDown={(event) => onHandlePointerDown(event, service, index)}
                onPointerUp={(event) => onHandlePointerUp(event, service)}
                style={{ border: 0, background: 'transparent', color: 'var(--tx3)', padding: 0, display: 'grid', placeItems: 'center', touchAction: 'none' }}
              >
                <GripVertical size={16} strokeWidth={2} aria-hidden />
              </button>
              <span data-testid={`icon-${service.name}`}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              </span>
              <button type="button" aria-label={`Apri ${service.name}`} onClick={() => setEditing(service)} style={{ flex: 1, textAlign: 'left', border: 0, background: 'transparent', color: service.active ? 'var(--tx)' : 'var(--tx3)', font: 'inherit' }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{service.name}</span>
              </button>
              <Chip>{summarizeDuration(service)}</Chip>
              <Chip>{summarizePrice(service)}</Chip>
              {service.active ? null : <StatusPill tone="warn">Disattivato</StatusPill>}
              <Toggle
                checked={service.active}
                label={service.name}
                onChange={(active) => api.saveExisting(service.id, { active })}
              />
            </Row>
          ))}
        </Card>
      </section>
    )
  }

  const principali = api.services.filter((service) => service.kind === 'principale')
  const extra = api.services.filter((service) => service.kind === 'extra')

  return (
    <PhoneShell>
      <Header title="Servizi e durate" backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {renderGroup('Principali', 'principale', principali)}
        {renderGroup('Extra', 'extra', extra)}
        <Button onClick={() => setEditing('new')}>Aggiungi servizio</Button>
      </div>
      <Dialog
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
      </Dialog>
    </PhoneShell>
  )
}
