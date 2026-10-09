import { Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { getSettings, type FieldLabels, type SettingsMain } from '../data/local/settings'
import { useDogs } from '../hooks/useDogs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { backupCounts, backupDay, backupFilename, backupStatusLabel, buildBackup, buildExportZip, isEmptyBackup, readRestoreBundle, restoreBackup, triggerDownload, type BackupBundle } from '../lib/backupDoc'
import { activeServicesSubtitle } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import type { ThemeChoice } from '../theme/theme'

const FIELD_EDITOR: { key: keyof FieldLabels; label: string }[] = [
  { key: 'species', label: 'Specie' },
  { key: 'breed', label: 'Razza' },
  { key: 'sex', label: 'Sesso' },
  { key: 'age', label: 'Età' },
  { key: 'weight', label: 'Peso' },
  { key: 'size', label: 'Taglia' },
  { key: 'clientType', label: 'Cliente' },
  { key: 'avgDuration', label: 'Durata media' },
]

const rowButton = {
  display: 'flex',
  flex: 1,
  flexDirection: 'column' as const,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left' as const,
  padding: 0,
}

function businessEmpty(business: SettingsMain['business']): boolean {
  return [business.name, business.vatNumber, business.phone, business.address].every((part) => part.trim() === '')
}

function contactLine(phone: string, address: string): string {
  return [phone, address].filter((part) => part.trim() !== '').join(' · ')
}

function SuggestionList({
  label,
  addLabel,
  values,
  onAdd,
  onRemove,
}: {
  label: string
  addLabel: string
  values: string[]
  onAdd: (value: string) => void
  onRemove: (value: string) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Input label={label} value={draft} onChange={(event) => setDraft(event.target.value)} />
        </div>
        <Button aria-label={addLabel} onClick={() => { onAdd(draft); setDraft('') }}>Aggiungi</Button>
      </div>
      {values.map((value) => (
        <div key={value} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{value}</span>
          <button type="button" aria-label={`Togli ${value}`} onClick={() => onRemove(value)} style={{ border: 0, background: 'transparent', color: 'var(--tx3)', font: 'inherit' }}>Togli</button>
        </div>
      ))}
    </div>
  )
}

export function SettingsPage() {
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const { settings, choose, save, reload } = useSettings()
  const toast = useToast()
  const { services } = useServices(uid ?? '')
  const { dogs } = useDogs(uid ?? '')
  const activeCount = uid ? services.filter((service) => service.active).length : 0
  const archived = dogs.filter((dog) => dog.status === 'non_in_cura' || dog.status === 'deceduto').length
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessDraft, setBusinessDraft] = useState(settings.business)
  const [labelsOpen, setLabelsOpen] = useState(false)
  const [labelDraft, setLabelDraft] = useState(settings.fieldLabels)
  const [tagsOpen, setTagsOpen] = useState(false)
  const [pending, setPending] = useState<BackupBundle | null>(null)
  const [daysText, setDaysText] = useState(() => String(settings.monthlyReminder.daysBefore))
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDaysText(String(settings.monthlyReminder.daysBefore))
  }, [settings.monthlyReminder.daysBefore])

  function onTheme(theme: ThemeChoice) {
    if (!choose(theme)) toast.show('Salvataggio non riuscito', 'plain')
  }

  function update(recipe: (current: SettingsMain) => SettingsMain) {
    if (!uid) return false
    const source = firebaseEnabled() && !readsLocal() ? settings : getSettings(uid)
    const ok = save(recipe(source))
    if (!ok) toast.show('Salvataggio non riuscito', 'plain')
    return ok
  }

  function openBusiness() {
    setBusinessDraft(settings.business)
    setBusinessOpen(true)
  }

  function saveBusiness() {
    const ok = update((current) => ({
      ...current,
      business: {
        name: businessDraft.name.trim(),
        vatNumber: businessDraft.vatNumber.trim(),
        phone: businessDraft.phone.trim(),
        address: businessDraft.address.trim(),
      },
    }))
    if (ok) setBusinessOpen(false)
  }

  async function copyVat() {
    try {
      await navigator.clipboard.writeText(settings.business.vatNumber)
      toast.show('Copiato', 'plain')
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  async function bundleFor(accountUid: string): Promise<BackupBundle> {
    if (!(firebaseEnabled() && !readsLocal())) return buildBackup(accountUid)
    const mod = await import('../data/firebase/client')
    return mod.loadCloudBackup(accountUid)
  }

  async function exportZip() {
    if (!uid) return
    try {
      triggerDownload('groomly-export.zip', await buildExportZip(await bundleFor(uid)))
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  async function runBackup() {
    if (!uid) return
    const now = new Date()
    let bundle: BackupBundle
    try {
      bundle = await bundleFor(uid)
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    const json = JSON.stringify(bundle)
    triggerDownload(backupFilename(now), new Blob([json], { type: 'application/json' }))
    update((current) => ({ ...current, backup: { ...current.backup, lastAt: now.toISOString() } }))
    if (!firebaseEnabled() || isEmptyBackup(bundle)) return
    const mod = await import('../data/firebase/client')
    mod.enqueueBackup(backupDay(now), json)
  }

  async function onRestoreFile(file: File) {
    try {
      const bundle = readRestoreBundle(JSON.parse(await file.text()) as unknown)
      if (!bundle) {
        toast.show('Salvataggio non riuscito', 'plain')
        return
      }
      setPending(bundle)
    } catch {
      toast.show('File non valido', 'plain')
    }
  }

  function confirmRestore() {
    if (!uid || !pending) return
    try {
      restoreBackup(uid, pending)
      reload()
      setPending(null)
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
    }
  }

  function saveLabels() {
    const ok = update((current) => {
      const fieldLabels = { ...current.fieldLabels }
      for (const field of FIELD_EDITOR) {
        const value = labelDraft[field.key].trim()
        if (value) fieldLabels[field.key] = value
      }
      return { ...current, fieldLabels }
    })
    if (ok) setLabelsOpen(false)
  }

  function addSuggestion(key: 'tagSuggestions' | 'toolSuggestions' | 'productSuggestions', value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    update((current) => (
      current[key].includes(trimmed) ? current : { ...current, [key]: [...current[key], trimmed] }
    ))
  }

  function removeSuggestion(key: 'tagSuggestions' | 'toolSuggestions' | 'productSuggestions', value: string) {
    update((current) => ({ ...current, [key]: current[key].filter((item) => item !== value) }))
  }

  function onAuto(autoDaily: boolean) {
    update((current) => ({ ...current, backup: { ...current.backup, autoDaily } }))
  }

  function onReminder(enabled: boolean) {
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, enabled } }))
  }

  function onTime(time: string) {
    if (!time) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, time } }))
  }

  function onDays(value: string) {
    setDaysText(value)
    if (!/^\d+$/.test(value)) return
    update((current) => ({ ...current, monthlyReminder: { ...current.monthlyReminder, daysBefore: Number(value) } }))
  }

  const counts = pending ? backupCounts(pending) : null
  const empty = businessEmpty(settings.business)
  const line = contactLine(settings.business.phone, settings.business.address)

  return (
    <PhoneShell>
      <Header title="Impostazioni" backTo="/" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <SectionTitle>Attività</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {empty ? <span>Aggiungi</span> : (
                <>
                  {settings.business.name ? <div style={{ fontWeight: 600 }}>{settings.business.name}</div> : null}
                  {settings.business.vatNumber ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{settings.business.vatNumber}</span>
                      <button type="button" onClick={() => void copyVat()} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: 0 }}>Copia</button>
                    </div>
                  ) : null}
                  {line ? <small style={{ color: 'var(--tx3)' }}>{line}</small> : null}
                </>
              )}
            </div>
            <IconButton label="Modifica attività" onClick={openBusiness}><Pencil size={16} strokeWidth={2} aria-hidden /></IconButton>
          </Row>
        </Card>

        <SectionTitle>Aspetto</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Tema</span>
            <Segmented label="Tema" value={settings.theme} onChange={onTheme} options={[
              { value: 'light', label: 'Chiaro' },
              { value: 'dark', label: 'Scuro' },
              { value: 'auto', label: 'Auto' },
            ]} />
          </Row>
        </Card>

        <SectionTitle>Dati e backup</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>{backupStatusLabel(settings.backup.lastAt)}</span>
            <Button onClick={runBackup}>Esegui</Button>
          </Row>
          <Row>
            <span style={{ flex: 1 }}>Backup automatico giornaliero</span>
            <Toggle checked={settings.backup.autoDaily} label="Backup automatico giornaliero" onChange={onAuto} />
          </Row>
          <Row>
            <Button onClick={() => exportZip()} style={{ flex: 1 }}>Esporta</Button>
            <Button variant="ghost" onClick={() => restoreRef.current?.click()} style={{ flex: 1 }}>Ripristina</Button>
            <input
              ref={restoreRef}
              aria-label="Scegli backup"
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void onRestoreFile(file)
              }}
            />
          </Row>
        </Card>

        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <button type="button" onClick={() => { setLabelDraft(settings.fieldLabels); setLabelsOpen(true) }} style={rowButton}>
              <span>Campi scheda</span>
            </button>
          </Row>
          <Row>
            <Link to="/impostazioni/servizi" style={{ display: 'flex', flex: 1, flexDirection: 'column', color: 'inherit', textDecoration: 'none' }}>
              <span>Servizi e durate</span>
              <small style={{ color: 'var(--tx3)' }}>{activeServicesSubtitle(activeCount)}</small>
            </Link>
          </Row>
          <Row>
            <button type="button" onClick={() => setTagsOpen(true)} style={rowButton}>
              <span>Tag caratteristiche</span>
              <small style={{ color: 'var(--tx3)' }}>{`${settings.tagSuggestions.length} tag · 4 caratteri`}</small>
            </button>
          </Row>
          <Row>
            <Link to="/animali?tab=archivio" style={{ display: 'flex', flex: 1, flexDirection: 'column', color: 'inherit', textDecoration: 'none' }}>
              <span>Archivio animali</span>
              <small style={{ color: 'var(--tx3)' }}>{`${archived} in archivio`}</small>
            </Link>
          </Row>
        </Card>

        <SectionTitle>Promemoria mensili</SectionTitle>
        <Card>
          <Row style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Attivo</span>
            <Toggle checked={settings.monthlyReminder.enabled} label="Promemoria mensili" onChange={onReminder} />
          </Row>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '7px 9px 9px' }}>
            <Input label="Orario" type="time" value={settings.monthlyReminder.time} onChange={(event) => onTime(event.target.value)} />
            <Input label="Giorni di anticipo" type="number" min={0} inputMode="numeric" value={daysText} onChange={(event) => onDays(event.target.value)} />
          </div>
        </Card>

        <p style={{ textAlign: 'center', color: 'var(--tx3)' }}>Groomly v1.0</p>
        <Button variant="ghost" onClick={() => session.logout()}>Esci</Button>
      </div>

      <Sheet open={businessOpen} title="Attività" onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label="Partita IVA" value={businessDraft.vatNumber} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Telefono" value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label="Indirizzo" value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <Button onClick={saveBusiness}>Salva</Button>
      </Sheet>
      <Sheet open={labelsOpen} title="Campi scheda" onClose={() => setLabelsOpen(false)}>
        {FIELD_EDITOR.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={labelDraft[field.key]}
            onChange={(event) => setLabelDraft({ ...labelDraft, [field.key]: event.target.value })}
          />
        ))}
        <Button onClick={saveLabels}>Salva</Button>
      </Sheet>
      <Sheet open={tagsOpen} title="Tag caratteristiche" onClose={() => setTagsOpen(false)}>
        <SuggestionList label="Tag" addLabel="Aggiungi tag" values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
        <SuggestionList label="Strumenti" addLabel="Aggiungi strumento" values={settings.toolSuggestions} onAdd={(value) => addSuggestion('toolSuggestions', value)} onRemove={(value) => removeSuggestion('toolSuggestions', value)} />
        <SuggestionList label="Prodotti" addLabel="Aggiungi prodotto" values={settings.productSuggestions} onAdd={(value) => addSuggestion('productSuggestions', value)} onRemove={(value) => removeSuggestion('productSuggestions', value)} />
      </Sheet>
      <Sheet open={pending !== null} title="Ripristina" onClose={() => setPending(null)}>
        <p style={{ margin: 0 }}>{counts ? `${counts.dogs} cani, ${counts.appointments} appuntamenti, ${counts.services} servizi` : ''}</p>
        <Button onClick={confirmRestore}>Ripristina</Button>
        <Button variant="ghost" onClick={() => setPending(null)}>Annulla</Button>
      </Sheet>
    </PhoneShell>
  )
}
