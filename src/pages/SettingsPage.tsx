import { Capacitor } from '@capacitor/core'
import { Archive, Bell, ChartLine, ChevronRight, Download, LogOut, Pencil, Scissors, Tag, Upload, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { ShellFrame } from './ShellFrame'
import { Sheet } from '../components/layout/Sheet'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Chip } from '../components/ui/Chip'
import { ChipRow } from '../components/ui/ChipRow'
import { IconButton } from '../components/ui/IconButton'
import { Sparkline } from '../components/earnings/Sparkline'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { StatusPill } from '../components/ui/StatusPill'
import { Toggle } from '../components/ui/Toggle'
import { AppError } from '../data/errors'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { getSettings, readBadge, type SettingsMain } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { backupCounts, backupDay, backupFilename, backupStatusLabel, buildBackup, buildExportZip, isEmptyBackup, readRestoreBundle, restoreBackup, triggerDownload, type BackupBundle } from '../lib/backupDoc'
import { APP_VERSION } from '../lib/appVersion'
import { localDayKey } from '../lib/appointments'
import { normalizeTaxCode, normalizeVat, taxCodeError, vatError } from '../lib/profile'
import { maskEuro, reportBadgeVisible, reportOf } from '../lib/earnings'
import { isOperator } from '../lib/salonPath'
import { downloadAnchor, isShareCancel, shareFiles } from '../lib/shareFile'
import { activeServicesSubtitle } from '../lib/serviceSummary'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { ThemeChoice } from '../theme/theme'

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
  return [business.salonName, business.name, business.vatNumber, business.taxCode, business.phone, business.address].every((part) => part.trim() === '')
}

function BusinessLines({ business, onCopy }: { business: SettingsMain['business']; onCopy: () => void }) {
  const salon = business.salonName.trim()
  const legal = business.name.trim()
  const phone = business.phone.trim()
  const address = business.address.trim()
  const title = salon || legal
  return (
    <>
      {title ? <div style={{ fontWeight: 600, ...USER_TEXT }}>{title}</div> : null}
      {salon && legal ? <div style={USER_TEXT}>{legal}</div> : null}
      {business.vatNumber ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={USER_TEXT}>{`Partita IVA ${business.vatNumber}`}</span>
          <button type="button" onClick={() => void onCopy()} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: 0 }}>Copia</button>
        </div>
      ) : null}
      {business.taxCode ? <div style={USER_TEXT}>{business.taxCode}</div> : null}
      {phone ? <div style={USER_TEXT}>{phone}</div> : null}
      {address ? <div style={USER_TEXT}>{address}</div> : null}
    </>
  )
}

function reportMonth(titolo: string): string {
  return titolo.split(' · fino a oggi')[0]
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
            <span style={USER_TEXT}>{value}</span>
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
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const { settings, theme, choose, save, reload, ready } = useSettings()
  const toast = useToast()
  const { prefs: pushPrefs } = usePushPrefs(uid ?? '')
  const { services } = useServices(uid ?? '')
  const { dogs } = useDogs(uid ?? '')
  const { appointments } = useAppointments(uid ?? '')
  const activeCount = uid ? services.filter((service) => service.active).length : 0
  const archived = dogs.filter((dog) => dog.status === 'non_in_cura' || dog.status === 'deceduto').length
  const [businessOpen, setBusinessOpen] = useState(false)
  const [businessDraft, setBusinessDraft] = useState(settings.business)
  const [businessErrors, setBusinessErrors] = useState<{ vat: string | null; taxCode: string | null }>({ vat: null, taxCode: null })
  const navigate = useNavigate()
  const location = useLocation()
  const [tagsOpen, setTagsOpen] = useState(false)
  const [pending, setPending] = useState<BackupBundle | null>(null)
  const [restoring, setRestoring] = useState(false)
  const restoringRef = useRef(false)
  const [registroBusy, setRegistroBusy] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!ready) return
    if (!uid) return
    const current = firebaseEnabled() && !readsLocal() ? settings : getSettings(uid)
    if (current.updatedAt === '') return
    if (readBadge(current.ui.reportBadgeSince)) return
    save({ ...current, ui: { ...current.ui, reportBadgeSince: localDayKey(new Date()) } })
  }, [ready, uid, settings, save])

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

  const openBusiness = useCallback(() => {
    setBusinessDraft(settings.business)
    setBusinessErrors({ vat: null, taxCode: null })
    setBusinessOpen(true)
  }, [settings.business])

  // «Aggiungi» della home arriva qui con openBusiness: il foglio si apre una volta, poi lo stato si toglie.
  const openBusinessState = (location.state as { openBusiness?: boolean } | null)?.openBusiness === true
  useEffect(() => {
    if (!openBusinessState || !ready) return
    openBusiness()
    navigate('.', { replace: true, state: null })
  }, [openBusinessState, ready, openBusiness, navigate])

  function saveBusiness() {
    const vat = vatError(businessDraft.vatNumber)
    const taxCode = taxCodeError(businessDraft.taxCode)
    setBusinessErrors({ vat, taxCode })
    if (vat !== null || taxCode !== null) return
    const ok = update((current) => ({
      ...current,
      business: {
        salonName: businessDraft.salonName.trim(),
        name: businessDraft.name.trim(),
        vatNumber: normalizeVat(businessDraft.vatNumber),
        phone: businessDraft.phone.trim(),
        address: businessDraft.address.trim(),
        taxCode: normalizeTaxCode(businessDraft.taxCode),
      },
    }))
    if (ok) setBusinessOpen(false)
  }

  async function copyVat() {
    try {
      await navigator.clipboard.writeText(settings.business.vatNumber)
      toast.show('Copiato', 'plain')
    } catch {
      toast.show('Copia non riuscita', 'plain')
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

  async function exportRegistro() {
    if (!uid || registroBusy) return
    setRegistroBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const raccolto = await raccogliBackup(now, { includiByte: false })
      const blob = await registroXlsx(raccolto.dati, { now })
      const file = { blob, name: 'Registro Groomly.xlsx' }
      if (Capacitor.isNativePlatform()) await shareFiles([file], 'Registro Groomly')
      else downloadAnchor(blob, file.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setRegistroBusy(false)
    }
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

  const counts = pending ? backupCounts(pending) : null
  const empty = businessEmpty(settings.business)
  const backupLabel = backupStatusLabel(settings.backup.lastAt)
  const now = new Date()
  const report = reportOf(appointments, dogs, services, 'mese', now)
  const hidden = settings.ui.hideAmounts
  const badge = reportBadgeVisible(settings.ui.reportBadgeSince, now)
  const delta = report.confronto.delta

  return (
    <ShellFrame>
      <Header title="Impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {isOperator(email) ? (
          <>
            <SectionTitle>Groomly</SectionTitle>
            <Card>
              <SRow style={{ borderTop: 'none' }}>
                <Link to="/impostazioni/utenti" style={menuLink}>
                  <MenuIcon tone="prim"><Users size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title="Utenti" />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
            </Card>
          </>
        ) : null}
        <SectionTitle>Attività</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {empty ? <span>Aggiungi</span> : <BusinessLines business={settings.business} onCopy={copyVat} />}
            </div>
            <IconButton label="Modifica attività" onClick={openBusiness}><Pencil size={16} strokeWidth={2} aria-hidden /></IconButton>
          </SRow>
          <SRow style={badge ? { background: 'linear-gradient(90deg, var(--pri-s) 0%, var(--card) 70%)' } : undefined}>
            <Link to="/incassi/report" style={menuLink}>
              <IconTile tone="ok"><ChartLine size={15} strokeWidth={2} aria-hidden /></IconTile>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  Incassi e report
                  {badge ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-pri)', background: 'var(--pri-solid)', borderRadius: 999, padding: '1px 6px' }}>NUOVO</span>
                  ) : null}
                </span>
                <small style={{ color: 'var(--tx2)', fontSize: TYPE.meta }}>
                  {reportMonth(report.titolo)} <b>{maskEuro(report.incassato, hidden)}</b>
                  {delta !== null && !hidden ? (
                    <span style={{ color: delta < 0 ? 'var(--bad)' : 'var(--ok)', fontWeight: 700 }}>
                      {` · ${delta < 0 ? '▼' : '▲'} ${Math.abs(delta)}% ${report.confronto.etichetta}`}
                    </span>
                  ) : null}
                </small>
              </span>
              <Sparkline values={report.punti.flatMap((point) => point.current === null ? [] : [point.current])} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <SectionTitle>Aspetto</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>Tema</span>
            <Segmented label="Tema" value={theme} onChange={onTheme} options={[
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
              <StatusPill tone="ok">{backupLabel}</StatusPill>
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
            <Button variant="secondary" onClick={() => restoreRef.current?.click()} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
          <SRow>
            <Button onClick={() => void exportRegistro()} disabled={registroBusy} aria-busy={registroBusy} style={{ flex: 1 }}>
              Registro Excel
            </Button>
          </SRow>
        </Card>

        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/servizi" style={menuLink}>
              <MenuIcon tone="prim"><Scissors size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Servizi e durate" detail={activeServicesSubtitle(activeCount)} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          <SRow>
            <button type="button" onClick={() => setTagsOpen(true)} style={rowButton}>
              <MenuIcon tone="warn"><Tag size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody
                title="Tag dei cani"
                detail={settings.tagSuggestions.length === 0
                  ? 'Nessuno da proporre'
                  : settings.tagSuggestions.length === 1
                    ? '1 da proporre sulla scheda'
                    : `${settings.tagSuggestions.length} da proporre sulla scheda`}
              />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
            <Link to="/impostazioni/archivio" style={menuLink}>
              <MenuIcon tone="prim"><Archive size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title="Archivio animali" detail={`${archived} in archivio`} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          <SRow>
            <Link to="/impostazioni/notifiche" style={menuLink}>
              <MenuIcon tone="prim"><Bell size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody
                title="Notifiche"
                detail={`${settings.monthlyReminder.enabled
                  ? `Promemoria mensile alle ${settings.monthlyReminder.time}`
                  : 'Promemoria mensile spento'} · ${pushPrefs.enabled ? 'Push attive' : 'Push spente'}`}
              />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/impostazioni/aggiornamenti')}
            aria-label={`Groomly ${APP_VERSION}, storico aggiornamenti`}
            style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--tx3)', font: 'inherit' }}
          >
            {`Groomly ${APP_VERSION}`}
          </button>
        </div>
        <Button variant="bad" size="lg" onClick={() => setLogoutOpen(true)} style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LogOut size={16} strokeWidth={2} aria-hidden />
          Esci
        </Button>
      </div>

      <Dialog open={businessOpen} title="Attività" onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label="Partita IVA" value={businessDraft.vatNumber} error={businessErrors.vat ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Nome toelettatura" value={businessDraft.salonName} onChange={(event) => setBusinessDraft({ ...businessDraft, salonName: event.target.value })} />
        <Input label="Codice fiscale" value={businessDraft.taxCode} autoCapitalize="characters" error={businessErrors.taxCode ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, taxCode: event.target.value })} />
        <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Basta la partita IVA oppure il codice fiscale.</small>
        <Input label="Telefono" value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label="Indirizzo" value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <Button onClick={saveBusiness}>Salva</Button>
      </Dialog>
      <Sheet
        open={tagsOpen}
        title="Tag dei cani"
        onClose={() => setTagsOpen(false)}
        footer={<Button variant="secondary" onClick={() => setTagsOpen(false)}>Chiudi</Button>}
      >
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.5 }}>
          Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.
        </p>
        <SuggestionList label="Tag" addLabel="Aggiungi tag" values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
      </Sheet>
      <Sheet open={pending !== null} title="Ripristina" onClose={() => setPending(null)}>
        <p style={{ margin: 0 }}>{counts ? `${counts.dogs} cani, ${counts.appointments} appuntamenti, ${counts.services} servizi` : ''}</p>
        <p style={{ margin: 0 }}>Sostituisce i dati di questo salone.</p>
        <Button variant="bad" onClick={() => { void confirmRestore() }} disabled={restoring}>Ripristina</Button>
        <Button variant="secondary" onClick={() => setPending(null)}>Annulla</Button>
      </Sheet>
      <Dialog open={logoutOpen} title="Uscire da Groomly?" onClose={() => setLogoutOpen(false)}>
        <Button variant="secondary" onClick={() => setLogoutOpen(false)}>Resta</Button>
        <Button variant="bad" onClick={() => session.logout()}>Esci</Button>
      </Dialog>
    </ShellFrame>
  )
}
