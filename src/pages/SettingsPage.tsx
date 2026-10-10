import { Archive, ChevronRight, Download, LogOut, Pencil, Scissors, SlidersHorizontal, Tag, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ChipRow } from '../components/ui/ChipRow'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { StatusPill } from '../components/ui/StatusPill'
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
  alignItems: 'center' as const,
  gap: 8,
  border: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left' as const,
  padding: 0,
}

const menuLink = {
  display: 'flex',
  flex: 1,
  alignItems: 'center' as const,
  gap: 8,
  color: 'inherit',
  textDecoration: 'none',
}

function MenuBody({ title, detail }: { title: string; detail?: string }) {
  return (
    <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <span>{title}</span>
      {detail ? <small style={{ color: 'var(--tx3)' }}>{detail}</small> : null}
    </span>
  )
}

function MenuIcon({ tone, children }: { tone: ComponentProps<typeof IconTile>['tone']; children: ReactNode }) {
  return <IconTile tone={tone} size="sm">{children}</IconTile>
}

function SRow({ style, ...props }: ComponentProps<typeof Row>) {
  return <Row {...props} style={{ minHeight: 52, ...style }} />
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
      <ChipRow>
        {values.map((value) => (
          <Chip key={value}>
            {value}
            <button type="button" aria-label={`Togli ${value}`} onClick={() => onRemove(value)} style={{ border: 0, background: 'transparent', color: 'inherit', padding: 0, display: 'inline-flex' }}>
              <X size={12} strokeWidth={2} aria-hidden />
            </button>
          </Chip>
        ))}
      </ChipRow>
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
  const [restoring, setRestoring] = useState(false)
  const restoringRef = useRef(false)
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

  async function confirmRestore() {
    if (!uid || !pending) return
    if (firebaseEnabled() && !readsLocal()) {
      if (restoringRef.current) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.show('Connessione assente', 'plain')
        return
      }
      const bundle = pending
      restoringRef.current = true
      setRestoring(true)
      try {
        const mod = await import('../data/firebase/client')
        await mod.replaceCloudData(uid, bundle)
        toast.show('Ripristinato', 'plain')
        setPending(null)
      } catch {
        toast.show('Ripristino incompleto, riprova', 'plain')
      } finally {
        restoringRef.current = false
        setRestoring(false)
      }
      return
    }
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
  const backupLabel = backupStatusLabel(settings.backup.lastAt)

  return (
    <PhoneShell>
      <Header title="Impostazioni" backTo="/" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        <SectionTitle>Attività</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none', alignItems: 'flex-start' }}>
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
          </SRow>
        </Card>

        <SectionTitle>Aspetto</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Tema</span>
            <Segmented label="Tema" value={settings.theme} onChange={onTheme} options={[
              { value: 'light', label: 'Chiaro' },
              { value: 'dark', label: 'Scuro' },
              { value: 'auto', label: 'Auto' },
            ]} />
          </SRow>
        </Card>

        <SectionTitle>Dati e backup</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>
              <StatusPill tone={backupLabel === 'Mai eseguito' ? 'warn' : 'ok'}>{backupLabel}</StatusPill>
            </span>
            <Button variant="tonal" size="sm" onClick={runBackup}>Esegui ora</Button>
          </SRow>
          <SRow>
            <span style={{ flex: 1 }}>Backup automatico giornaliero</span>
            <Toggle checked={settings.backup.autoDaily} label="Backup automatico giornaliero" onChange={onAuto} />
          </SRow>
          <SRow>
            <Button onClick={() => exportZip()} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Download size={16} strokeWidth={2} aria-hidden />
              Esporta
            </Button>
            <Button variant="ghost" onClick={() => restoreRef.current?.click()} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Upload size={16} strokeWidth={2} aria-hidden />
              Ripristina
            </Button>
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
          </SRow>
        </Card>

        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" onClick={() => { setLabelDraft(settings.fieldLabels); setLabelsOpen(true) }} style={rowButton}>
              <MenuIcon tone="prim"><SlidersHorizontal size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Campi scheda" />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
            <Link to="/impostazioni/servizi" style={menuLink}>
              <MenuIcon tone="prim"><Scissors size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Servizi e durate" detail={activeServicesSubtitle(activeCount)} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          <SRow>
            <button type="button" onClick={() => setTagsOpen(true)} style={rowButton}>
              <MenuIcon tone="warn"><Tag size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Tag caratteristiche" detail={`${settings.tagSuggestions.length} tag · 4 caratteri`} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
            <Link to="/animali?tab=archivio" style={menuLink}>
              <MenuIcon tone="prim"><Archive size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Archivio animali" detail={`${archived} in archivio`} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <SectionTitle>Promemoria mensili</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Attivo</span>
            <Toggle checked={settings.monthlyReminder.enabled} label="Promemoria mensili" onChange={onReminder} />
          </SRow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '7px 9px 9px' }}>
            <Input label="Orario" type="time" value={settings.monthlyReminder.time} onChange={(event) => onTime(event.target.value)} />
            <Input label="Giorni di anticipo" type="number" min={0} inputMode="numeric" value={daysText} onChange={(event) => onDays(event.target.value)} />
          </div>
        </Card>

        <p style={{ margin: 0, textAlign: 'center', color: 'var(--tx3)' }}>Groomly v1.0</p>
        <Button variant="bad" size="lg" onClick={() => session.logout()} style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LogOut size={16} strokeWidth={2} aria-hidden />
          Esci
        </Button>
      </div>

      <Dialog open={businessOpen} title="Attività" onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label="Partita IVA" value={businessDraft.vatNumber} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Telefono" value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label="Indirizzo" value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <Button onClick={saveBusiness}>Salva</Button>
      </Dialog>
      <Dialog open={labelsOpen} title="Campi scheda" onClose={() => setLabelsOpen(false)}>
        {FIELD_EDITOR.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={labelDraft[field.key]}
            onChange={(event) => setLabelDraft({ ...labelDraft, [field.key]: event.target.value })}
          />
        ))}
        <Button onClick={saveLabels}>Salva</Button>
      </Dialog>
      <Sheet
        open={tagsOpen}
        title="Tag caratteristiche"
        onClose={() => setTagsOpen(false)}
        footer={<Button variant="ghost" onClick={() => setTagsOpen(false)}>Chiudi</Button>}
      >
        <SuggestionList label="Tag" addLabel="Aggiungi tag" values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
        <SuggestionList label="Strumenti" addLabel="Aggiungi strumento" values={settings.toolSuggestions} onAdd={(value) => addSuggestion('toolSuggestions', value)} onRemove={(value) => removeSuggestion('toolSuggestions', value)} />
        <SuggestionList label="Prodotti" addLabel="Aggiungi prodotto" values={settings.productSuggestions} onAdd={(value) => addSuggestion('productSuggestions', value)} onRemove={(value) => removeSuggestion('productSuggestions', value)} />
      </Sheet>
      <Sheet open={pending !== null} title="Ripristina" onClose={() => setPending(null)}>
        <p style={{ margin: 0 }}>{counts ? `${counts.dogs} cani, ${counts.appointments} appuntamenti, ${counts.services} servizi` : ''}</p>
        <Button onClick={() => { void confirmRestore() }} disabled={restoring}>Ripristina</Button>
        <Button variant="ghost" onClick={() => setPending(null)}>Annulla</Button>
      </Sheet>
    </PhoneShell>
  )
}
