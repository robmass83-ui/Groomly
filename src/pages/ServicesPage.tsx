import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ChevronRight, GripVertical } from 'lucide-react'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Dialog } from '../components/layout/Dialog'
import { useToast } from '../components/layout/Toast'
import { ServiceIcon } from '../components/domain/ServiceIcon'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { SectionHeader } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { pubblicabile } from '../lib/catalogoPrenotazione'
import { t } from '../i18n/t'
import { useServices } from '../hooks/useServices'
import { summarizeDuration, summarizePrice } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import type { Service, ServiceInput } from '../types/models'
import { ServiceSheet } from './ServiceSheet'

function principalePubblicabile(service: Pick<Service, 'id' | 'name' | 'kind' | 'active' | 'durationMin' | 'price'>): boolean {
  return service.kind === 'principale'
    && service.active !== false
    && pubblicabile({
      id: service.id,
      nome: service.name,
      kind: service.kind,
      minuti: service.durationMin,
      prezzo: service.price,
    })
}

export function ServicesPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useServices(uid)
  const { settings, save } = useSettings()
  const toast = useToast()
  const [editing, setEditing] = useState<Service | 'new' | null>(null)
  const dragFrom = useRef<{ id: string; index: number } | null>(null)

  useEffect(() => {
    if (api.error) toast.show(api.error, 'plain')
  }, [api.error])

  function confermaListino(elenco: readonly Pick<Service, 'id' | 'name' | 'kind' | 'active' | 'durationMin' | 'price'>[]) {
    const resta = elenco.some(principalePubblicabile)
    save({
      ...settings,
      listinoConfermato: true,
      ...(!resta && settings.prenotazioniOnline === true ? { prenotazioniOnline: false } : {}),
    })
  }

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
      const prossimi = editing === 'new'
        ? [...api.services, {
          id: 'nuovo',
          name: input.name,
          kind: input.kind,
          durationMin: input.durationMin,
          price: input.price,
          active: input.active,
        }]
        : editing
          ? api.services.map((service) => service.id === editing.id
            ? { ...service, name: input.name, durationMin: input.durationMin, price: input.price, active: input.active }
            : service)
          : api.services
      confermaListino(prossimi)
      toast.show(frasi.schedaSalvato, 'ok')
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
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minHeight: 0,
              }}
            >
              <button
                type="button"
                aria-label={t(lingua, 'srvRiordina', { nome: service.name })}
                onKeyDown={(event) => onHandleKey(service, index, event)}
                onPointerDown={(event) => onHandlePointerDown(event, service, index)}
                onPointerUp={(event) => onHandlePointerUp(event, service)}
                style={{ flex: 'none', border: 0, background: 'transparent', color: 'var(--tx3)', padding: 8, display: 'grid', placeItems: 'center', touchAction: 'none' }}
              >
                <GripVertical size={16} strokeWidth={2} aria-hidden />
              </button>
              <span data-testid={`icon-${service.name}`} style={{ flex: 'none' }}>
                <ServiceIcon iconKey={service.iconKey} size={SIZES.serviceIcon.row} />
              </span>
              <button
                type="button"
                aria-label={t(lingua, 'apriNome', { nome: service.name })}
                onClick={() => setEditing(service)}
                style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', border: 0, background: 'transparent', color: 'inherit', font: 'inherit', padding: 0 }}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '0 1 auto', fontWeight: 600, color: service.active ? 'var(--tx)' : 'var(--tx3)' }}>
                  {service.name}
                </span>
                <span style={{ flex: 'none', color: 'var(--tx3)', fontSize: 13, whiteSpace: 'nowrap' }}>
                  {service.active ? `${summarizeDuration(service)} · ${summarizePrice(service)}` : frasi.servizioSpento}
                </span>
                <ChevronRight size={16} strokeWidth={2} aria-hidden />
              </button>
              <Toggle
                checked={service.active}
                label={service.name}
                onChange={(active) => {
                  if (!api.saveExisting(service.id, { active })) return
                  confermaListino(api.services.map((item) => item.id === service.id ? { ...item, active } : item))
                }}
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
      <Header title={frasi.srvTitolo} subtitle={frasi.srvSpiega} backTo="/impostazioni" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {renderGroup(frasi.srvPrincipali, 'principale', principali)}
        {renderGroup(frasi.servExtra, 'extra', extra)}
        <Button onClick={() => setEditing('new')}>{frasi.srvAggiungi}</Button>
      </div>
      <Dialog
        open={editing !== null}
        title={editing === 'new' ? frasi.srvNuovo : frasi.srvModifica}
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
