import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { useEffect, useState } from 'react'
import { Header } from '../components/layout/Header'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { SectionHeader } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { getSettings, type SettingsMain } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dueSoon } from '../lib/cycle'
import { readPushStatus, setPushStatus, subscribePushStatus } from '../lib/pushStatus'
import { reminderText } from '../lib/reminderText'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'
import { useToast } from '../components/layout/Toast'

export function NotificationsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const monthlyLocked = session.gate.kind === 'in' && session.gate.account.role === 'collaboratore'
  const { settings, save } = useSettings()
  const { prefs: pushPrefs, save: savePushPrefs } = usePushPrefs(uid)
  const toast = useToast()
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const [now] = useState(() => new Date())
  const [daysText, setDaysText] = useState(() => String(settings.monthlyReminder.daysBefore))
  const [minutesText, setMinutesText] = useState(() => String(pushPrefs.completeAfterMin))
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [pushStatus, setPagePushStatus] = useState(readPushStatus)

  const { time, daysBefore, enabled } = settings.monthlyReminder

  useEffect(() => {
    setDaysText(String(settings.monthlyReminder.daysBefore))
  }, [settings.monthlyReminder.daysBefore])

  useEffect(() => {
    setMinutesText(String(pushPrefs.completeAfterMin))
  }, [pushPrefs.completeAfterMin])

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
    if (monthlyLocked) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, enabled: next } }))
  }

  function onTime(next: string) {
    if (monthlyLocked || !next) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, time: next } }))
  }

  function onDays(value: string) {
    if (monthlyLocked) return
    setDaysText(value)
    if (!/^\d+$/.test(value)) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, daysBefore: Number(value) } }))
  }

  function onPushEnabled(next: boolean) {
    if (next) setPushStatus({ permissionDenied: false, unavailable: false })
    savePushPrefs({ ...pushPrefs, enabled: next })
  }

  function onPushType(key: 'updates' | 'complete', next: boolean) {
    savePushPrefs({ ...pushPrefs, [key]: next })
  }

  function onCompleteAfter(value: string) {
    const lastValid = pushPrefs.completeAfterMin
    if (value === '' || !/^\d+$/.test(value)) {
      setMinutesText(String(lastValid))
      return
    }
    const minutes = Number(value)
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
      setMinutesText(String(lastValid))
      return
    }
    setMinutesText(value)
    savePushPrefs({ ...pushPrefs, completeAfterMin: minutes })
  }

  function onCompleteAfterKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key.length !== 1 || /^\d$/.test(event.key)) return
    event.preventDefault()
    setMinutesText(String(pushPrefs.completeAfterMin))
  }

  const windowPhrase = daysBefore === 1
    ? 'entro il giorno successivo'
    : `entro i prossimi ${daysBefore} giorni`
  const intro = `Alle ${time} il telefono avvisa se un cliente mensile è in ritardo o va toelettato ${windowPhrase}. Per esempio: «2 mensili da programmare: Rex, Luna». Se apri la notifica, vai in Mensili.`
  const due = dueSoon(dogs, appointments, now, daysBefore)
  const live = reminderText(due)
  const statusLine = live
    ? `Adesso direbbe: ${live}`
    : 'Adesso non parte nessuna notifica, perché non c’è un mensile in ritardo o in scadenza.'

  const copyStyle = { margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.5, ...USER_TEXT }

  return (
    <ShellFrame>
      <Header title="Notifiche" backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <Card style={{ overflow: 'visible' }}>
          <div style={{ padding: '9px 9px 11px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHeader>Promemoria mensili</SectionHeader>
            <p style={copyStyle}>{intro}</p>
            <p style={copyStyle}>{statusLine}</p>
            <p style={copyStyle}>Il riquadro in Home resta anche con la notifica spenta.</p>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
              <span style={{ flex: 1, ...USER_TEXT }}>Notifica sul telefono</span>
              <Toggle checked={enabled} disabled={monthlyLocked} label="Notifica sul telefono" onChange={onReminder} />
            </div>
            {permissionDenied ? (
              <p style={copyStyle}>Per riceverle, consenti le notifiche a Groomly.</p>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Input label="Orario della notifica" type="time" value={time} disabled={monthlyLocked} onChange={(event) => onTime(event.target.value)} />
              <Input label="Giorni di anticipo" type="number" min={0} inputMode="numeric" value={daysText} disabled={monthlyLocked} onChange={(event) => onDays(event.target.value)} />
            </div>
            <p style={copyStyle}>Vale per la notifica e per il riquadro in Home.</p>
          </div>
        </Card>
        <Card style={{ overflow: 'visible' }}>
          <div style={{ padding: '9px 9px 11px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SectionHeader>Notifiche push</SectionHeader>
            <p style={copyStyle}>Arrivano sul telefono, anche con Groomly chiusa. Non spostano i riquadri in Home.</p>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
              <span style={{ flex: 1, ...USER_TEXT }}>Notifiche push</span>
              <Toggle checked={pushPrefs.enabled} label="Notifiche push" onChange={onPushEnabled} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
              <span style={{ flex: 1, ...USER_TEXT }}>Aggiornamenti</span>
              <Toggle
                checked={pushPrefs.updates}
                disabled={!pushPrefs.enabled}
                label="Aggiornamenti"
                onChange={(next) => onPushType('updates', next)}
              />
            </div>
            <p style={copyStyle}>Sul telefono: «È pronta la versione 1.2.0».</p>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: 44 }}>
              <span style={{ flex: 1, ...USER_TEXT }}>Da completare</span>
              <Toggle
                checked={pushPrefs.complete}
                disabled={!pushPrefs.enabled}
                label="Da completare"
                onChange={(next) => onPushType('complete', next)}
              />
            </div>
            <p style={copyStyle}>Sul telefono: «C’è da completare Lilly: è passato il tempo dopo la fine dell’appuntamento».</p>
            {!Capacitor.isNativePlatform() ? <p style={copyStyle}>Da questo browser non partono.</p> : null}
            {pushStatus.unavailable ? <p style={copyStyle}>Le notifiche push non sono disponibili su questo telefono.</p> : null}
            {pushStatus.permissionDenied ? <p style={copyStyle}>Per riceverle, consenti le notifiche a Groomly.</p> : null}
            <Input
              label="Minuti dopo la fine"
              type="number"
              min={0}
              max={1440}
              inputMode="numeric"
              disabled={!pushPrefs.enabled}
              value={minutesText}
              onChange={(event) => onCompleteAfter(event.target.value)}
              onKeyDown={onCompleteAfterKeyDown}
            />
            <p style={copyStyle}>Vale solo per questa push. In Home, Da chiudere resta un’ora dopo la fine.</p>
          </div>
        </Card>
      </div>
    </ShellFrame>
  )
}
