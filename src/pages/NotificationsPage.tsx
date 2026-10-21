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
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { dueSoon } from '../lib/cycle'
import { reminderText } from '../lib/reminderText'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'
import { useToast } from '../components/layout/Toast'

export function NotificationsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { settings, save } = useSettings()
  const toast = useToast()
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const [now] = useState(() => new Date())
  const [daysText, setDaysText] = useState(() => String(settings.monthlyReminder.daysBefore))
  const [permissionDenied, setPermissionDenied] = useState(false)

  const { time, daysBefore, enabled } = settings.monthlyReminder

  useEffect(() => {
    setDaysText(String(settings.monthlyReminder.daysBefore))
  }, [settings.monthlyReminder.daysBefore])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const check = LocalNotifications.checkPermissions
    if (typeof check !== 'function') return
    void check().then((result) => {
      if (result.display !== 'granted') setPermissionDenied(true)
    }).catch(() => {})
  }, [])

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
    if (!next) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, time: next } }))
  }

  function onDays(value: string) {
    setDaysText(value)
    if (!/^\d+$/.test(value)) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, daysBefore: Number(value) } }))
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
            <Toggle checked={enabled} label="Notifica sul telefono" onChange={onReminder} />
            {permissionDenied ? (
              <p style={copyStyle}>Per riceverle, consenti le notifiche a Groomly.</p>
            ) : null}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Input label="Orario della notifica" type="time" value={time} onChange={(event) => onTime(event.target.value)} />
              <Input label="Giorni di anticipo" type="number" min={0} inputMode="numeric" value={daysText} onChange={(event) => onDays(event.target.value)} />
            </div>
            <p style={copyStyle}>Vale per la notifica e per il riquadro in Home.</p>
          </div>
        </Card>
      </div>
    </ShellFrame>
  )
}
