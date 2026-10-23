import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Bell, Calendar, CircleCheck, Clock, Home, Info, Lock, Sparkles } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Toggle } from '../components/ui/Toggle'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { getSettings, type SettingsMain } from '../data/local/settings'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import type { PushPrefs } from '../lib/pushDue'
import { readPushStatus, setPushStatus, subscribePushStatus } from '../lib/pushStatus'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const INFO = {
  mensili: {
    title: 'Mensili in scadenza',
    body: 'Ricevi una notifica push per i cani con abbonamento mensile che non hanno ancora un appuntamento fissato e il cui periodo mensile sta per scadere. Puoi impostare l\'orario e con quanti giorni di anticipo ricevere l\'avviso.',
  },
  versione: {
    title: 'Nuova versione',
    body: 'Ricevi una notifica push quando è disponibile un nuovo aggiornamento dell\'app.',
  },
  chiudere: {
    title: 'Da chiudere',
    body: 'Ricevi una notifica push che ti ricorda di chiudere un appuntamento quando l\'orario fissato è già passato. Puoi impostare dopo quanto tempo ricevere il promemoria.',
  },
} as const

type InfoId = keyof typeof INFO

function giorniPrima(days: number): string {
  return days === 1 ? '1 giorno prima' : `${days} giorni prima`
}

function minutiDopo(minutes: number): string {
  return minutes === 1 ? '1 min dopo' : `${minutes} min dopo`
}

function Tile({ tone, children }: { tone: 'tea' | 'pri' | 'warn'; children: ReactNode }) {
  const palette = {
    tea: { background: 'var(--tea-s)', color: 'var(--tea)' },
    pri: { background: 'var(--pri-s)', color: 'var(--pri-ink)' },
    warn: { background: 'var(--warn-s)', color: 'var(--warn)' },
  }[tone]
  return (
    <span aria-hidden style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center', flex: 'none', ...palette }}>
      {children}
    </span>
  )
}

function Mini({ muted, children }: { muted?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        background: muted ? 'var(--surf)' : 'var(--pri-s)',
        color: muted ? 'var(--tx3)' : 'var(--pri-ink)',
      }}
    >
      {children}
    </span>
  )
}

const stepButton = {
  width: 32,
  height: 36,
  border: 0,
  background: 'transparent',
  color: 'var(--pri-ink)',
  fontSize: 16,
  fontWeight: 600,
  padding: 0,
} as const

function Stepper({
  value,
  minusLabel,
  plusLabel,
  disabled = false,
  onMinus,
  onPlus,
}: {
  value: string
  minusLabel: string
  plusLabel: string
  disabled?: boolean
  onMinus: () => void
  onPlus: () => void
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', height: 36, borderRadius: 10, background: 'var(--surf)', border: '1px solid var(--line)', opacity: disabled ? 0.38 : 1, flex: 'none' }}>
      <button type="button" aria-label={minusLabel} disabled={disabled} onClick={onMinus} style={stepButton}>−</button>
      <span style={{ fontSize: 13, fontWeight: 700, padding: '0 6px', whiteSpace: 'nowrap' }}>{value}</span>
      <button type="button" aria-label={plusLabel} disabled={disabled} onClick={onPlus} style={stepButton}>+</button>
    </span>
  )
}

export function NotificationsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { settings, save } = useSettings()
  const { prefs: pushPrefs, save: savePushPrefs } = usePushPrefs(uid)
  const toast = useToast()
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [pushStatus, setPagePushStatus] = useState(readPushStatus)
  const [info, setInfo] = useState<InfoId | null>(null)

  const { time, daysBefore, enabled } = settings.monthlyReminder
  const updatesOn = pushPrefs.enabled && pushPrefs.updates
  const completeOn = pushPrefs.enabled && pushPrefs.complete

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const check = LocalNotifications.checkPermissions
    if (typeof check !== 'function') return
    void check().then((result) => {
      if (result.display !== 'granted') setPermissionDenied(true)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    return subscribePushStatus(() => setPagePushStatus(readPushStatus()))
  }, [])

  useEffect(() => {
    if (pushStatus.permissionDenied && pushPrefs.enabled) {
      savePushPrefs({ ...pushPrefs, enabled: false })
    }
  }, [pushPrefs, pushStatus.permissionDenied, savePushPrefs])

  function update(recipe: (current: SettingsMain) => SettingsMain) {
    if (!uid) return false
    const source = firebaseEnabled() && !readsLocal() ? settings : getSettings(uid)
    const ok = save(recipe(source))
    if (!ok) toast.show('Salvataggio non riuscito', 'plain')
    return ok
  }

  function onReminder(next: boolean) {
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, enabled: next } }))
  }

  function onTime(next: string) {
    if (!next || !enabled) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, time: next } }))
  }

  function onDays(delta: number) {
    const days = Math.max(0, daysBefore + delta)
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, daysBefore: days } }))
  }

  function onUpdates(next: boolean) {
    const complete = next && !pushPrefs.enabled ? false : pushPrefs.complete
    savePush({
      updates: next,
      complete,
      enabled: next || (pushPrefs.enabled && complete),
    })
  }

  function onComplete(next: boolean) {
    const updates = next && !pushPrefs.enabled ? false : pushPrefs.updates
    savePush({
      complete: next,
      updates,
      enabled: next || (pushPrefs.enabled && updates),
    })
  }

  function savePush(patch: Pick<PushPrefs, 'enabled' | 'updates' | 'complete'>) {
    if (patch.enabled) setPushStatus({ permissionDenied: false, unavailable: false })
    savePushPrefs({ ...pushPrefs, ...patch })
  }

  function onMinutes(delta: number) {
    if (!completeOn) return
    const minutes = Math.min(1440, Math.max(0, pushPrefs.completeAfterMin + delta))
    savePushPrefs({ ...pushPrefs, completeAfterMin: minutes })
  }

  const notice = permissionDenied || pushStatus.permissionDenied
    ? 'Consenti le notifiche a Groomly.'
    : pushStatus.unavailable
      ? 'Le notifiche push non sono disponibili su questo telefono.'
      : ''
  const openInfo = info ? INFO[info] : null

  return (
    <ShellFrame>
      <Header title="Notifiche" backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <Tile tone="tea"><Calendar size={15} strokeWidth={2} /></Tile>
            <span style={titleStyle}>Mensili in scadenza</span>
            <button type="button" aria-label="Informazioni su Mensili in scadenza" onClick={() => setInfo('mensili')} style={infoButton}>
              <Info size={16} strokeWidth={2} aria-hidden />
            </button>
            <Toggle checked={enabled} label="Mensili in scadenza" onChange={onReminder} />
          </Row>
          <div style={controls}>
            <label style={{ ...chip, opacity: enabled ? 1 : 0.38 }}>
              <Clock size={14} strokeWidth={2} aria-hidden color="var(--tx3)" />
              <input
                aria-label="Orario"
                type="time"
                value={time}
                disabled={!enabled}
                onChange={(event) => onTime(event.target.value)}
                style={timeInput}
              />
            </label>
            <span style={cluster}>
              <Stepper
                value={giorniPrima(daysBefore)}
                minusLabel="Meno giorni"
                plusLabel="Più giorni"
                onMinus={() => onDays(-1)}
                onPlus={() => onDays(1)}
              />
              <Mini><Bell size={13} strokeWidth={2} /></Mini>
              <Mini><Home size={13} strokeWidth={2} /></Mini>
            </span>
          </div>
          <Row>
            <Tile tone="pri"><Sparkles size={15} strokeWidth={2} /></Tile>
            <span style={titleStyle}>Nuova versione</span>
            <button type="button" aria-label="Informazioni su Nuova versione" onClick={() => setInfo('versione')} style={infoButton}>
              <Info size={16} strokeWidth={2} aria-hidden />
            </button>
            <Toggle checked={updatesOn} label="Nuova versione" onChange={onUpdates} />
          </Row>
          <Row>
            <Tile tone="warn"><CircleCheck size={15} strokeWidth={2} /></Tile>
            <span style={titleStyle}>Da chiudere</span>
            <button type="button" aria-label="Informazioni su Da chiudere" onClick={() => setInfo('chiudere')} style={infoButton}>
              <Info size={16} strokeWidth={2} aria-hidden />
            </button>
            <Toggle checked={completeOn} label="Da chiudere" onChange={onComplete} />
          </Row>
          <div style={controls}>
            <span style={cluster}>
              <Stepper
                value={minutiDopo(pushPrefs.completeAfterMin)}
                minusLabel="Meno minuti"
                plusLabel="Più minuti"
                disabled={!completeOn}
                onMinus={() => onMinutes(-1)}
                onPlus={() => onMinutes(1)}
              />
              <Mini muted={!completeOn}><Bell size={13} strokeWidth={2} /></Mini>
              <span style={lockChip}>
                <Home size={13} strokeWidth={2} aria-hidden />
                <Lock size={12} strokeWidth={2} aria-hidden />
                1 ora
              </span>
            </span>
          </div>
        </Card>
        {notice ? <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, ...USER_TEXT }}>{notice}</p> : null}
      </div>
      <Dialog open={openInfo !== null} title={openInfo?.title ?? ''} onClose={() => setInfo(null)}>
        {openInfo ? (
          <>
            <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.45, ...USER_TEXT }}>{openInfo.body}</p>
            <Button onClick={() => setInfo(null)}>Ho capito</Button>
          </>
        ) : null}
      </Dialog>
    </ShellFrame>
  )
}

const titleStyle = { flex: 1, minWidth: 0, fontSize: 15, fontWeight: 650, letterSpacing: '-0.01em', ...USER_TEXT } as const

const infoButton = {
  width: 36,
  height: 44,
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--tx3)',
  display: 'grid',
  placeItems: 'center',
  padding: 0,
  flex: 'none',
} as const

const controls = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexWrap: 'wrap',
  minHeight: 44,
  padding: '4px 10px 8px',
  borderTop: '1px solid var(--line)',
} as const

const cluster = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  flex: 'none',
} as const

const chip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  height: 36,
  padding: '0 8px',
  borderRadius: 10,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
  color: 'var(--tx)',
  flex: 'none',
} as const

const timeInput = {
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  padding: 0,
  width: 92,
} as const

const lockChip = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 36,
  padding: '0 8px 0 6px',
  borderRadius: 10,
  background: 'var(--surf)',
  border: '1px solid var(--line)',
  color: 'var(--tx3)',
  fontSize: 12,
  fontWeight: 700,
  flex: 'none',
} as const
