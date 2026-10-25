import { Capacitor } from '@capacitor/core'
import { Archive, Bell, ChartLine, ChevronRight, Cloud, Download, FileArchive, FileSpreadsheet, Image, LogOut, Pencil, Scissors, Sparkles, Tag, Upload, Users, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { ShellFrame } from './ShellFrame'
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
import type { LocalAccount } from '../data/local/auth'
import { getSettings, readBadge, type SettingsMain } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { PianoCard } from '../components/piano/PianoCard'
import { CopieCloudRiga } from '../components/piano/CopieCloudRiga'
import { OrariEditor } from '../components/piano/OrariEditor'
import { usePiano } from '../hooks/usePiano'
import { it } from '../i18n/it'
import { voceTeam } from '../lib/salonAccess'
import { hrefVoce, vociMenuPiani } from '../lib/vociMenu'
import { useSettings } from '../hooks/useSettings'
import { backupCounts, backupDay, backupFilename, backupStatusLabel, buildBackup, buildExportZip, isEmptyBackup, restoreBackup, triggerDownload, type BackupBundle } from '../lib/backupDoc'
import type { FileRipristino } from '../lib/leggiRipristino'
import type { CodiciCaneDoc } from '../lib/codiceCane'
import { APP_VERSION } from '../lib/appVersion'
import { DriveAuth, type DriveCopia } from '../lib/driveAuth'
import { inviaBackupSuDrive, messaggioInvio, programmaInvio } from '../lib/driveInvio'
import { chiaveErroreDrive, statoDrive } from '../lib/statoDrive'
import { unisciRegistri } from '../lib/unisciBackup'
import { cartellaBackup, elencoCopie, etichettaCopia, leggiCopia, messaggioRipristinoDrive } from '../lib/driveRipristino'
import { cancellaCopiaLocale, leggiCopiaLocale, salvaCopiaLocale } from '../lib/ripristinoSicurezza'
import { localDayKey } from '../lib/appointments'
import { normalizeTaxCode, normalizeVat, taxCodeError, vatError } from '../lib/profile'
import { maskEuro, reportBadgeVisible, reportOf } from '../lib/earnings'
import { visibleAppointments } from '../lib/salonAccess'
import { isOperator, type AccountRole } from '../lib/salonPath'
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
  minHeight: 44,
  width: '100%',
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

function GroupLabel({ children }: { children: string }) {
  return (
    <div style={{ margin: '8px 2px 0', fontSize: 10, fontWeight: 750, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--tx3)' }}>
      {children}
    </div>
  )
}

function BackupAction({
  label,
  detail,
  tone,
  icon,
  onClick,
  disabled,
  busy,
}: {
  label: string
  detail: string
  tone: ComponentProps<typeof IconTile>['tone']
  icon: ReactNode
  onClick: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} disabled={disabled} aria-busy={busy || undefined} style={rowButton}>
      <MenuIcon tone={tone}>{icon}</MenuIcon>
      <MenuBody title={label} detail={detail} />
    </button>
  )
}

function SRow({ style, ...props }: ComponentProps<typeof Row>) {
  return <Row {...props} style={{ minHeight: 52, ...style }} />
}

function businessEmpty(business: SettingsMain['business']): boolean {
  return [business.salonName, business.name, business.vatNumber, business.taxCode, business.phone, business.address].every((part) => part.trim() === '')
}

function businessHeadline(business: SettingsMain['business']): { title: string; detail: string } {
  const salon = business.salonName.trim()
  const legal = business.name.trim()
  const title = salon || legal
  const parts: string[] = []
  if (salon && legal) parts.push(legal)
  if (business.vatNumber.trim()) parts.push(`Partita IVA ${business.vatNumber.trim()}`)
  else if (business.taxCode.trim()) parts.push(business.taxCode.trim())
  return { title, detail: parts.join(' · ') }
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

function earningsViewer(account: LocalAccount | null): { uid: string; ownerUid: string; role: AccountRole } {
  const uid = account?.uid ?? ''
  const role: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  return { uid, ownerUid: account?.salonId || uid, role }
}

export function SettingsPage() {
  const session = useSession()
  const piano = usePiano()
  const voce = voceTeam(piano.mostraPiani, piano.stato)
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const menuPiani = piano.mostraPiani && account?.role !== 'collaboratore'
  const uid = account?.uid ?? null
  const email = account?.email ?? null
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
  const [backupOpen, setBackupOpen] = useState(false)
  type RipristinoPronto = { bundle: BackupBundle; codici: CodiciCaneDoc | null; file: FileRipristino[] }
  const [pending, setPending] = useState<RipristinoPronto | null>(null)
  const [restoring, setRestoring] = useState(false)
  const restoringRef = useRef(false)
  const [undo, setUndo] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const undoingRef = useRef(false)
  const presaRef = useRef(false)
  const copiaLetta = useRef(0)
  const driveLettura = useRef(0)
  const [registroBusy, setRegistroBusy] = useState(false)
  const [zipBusy, setZipBusy] = useState(false)
  const [completoBusy, setCompletoBusy] = useState(false)
  const [driveEmail, setDriveEmail] = useState<string | null>(null)
  const [driveBusy, setDriveBusy] = useState(false)
  const [invioBusy, setInvioBusy] = useState(false)
  const [parola, setParola] = useState('')
  const [copie, setCopie] = useState<DriveCopia[] | null>(null)
  const [copieBusy, setCopieBusy] = useState(false)
  const driveBusyRef = useRef(false)
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

  function pubblicaUndo(visibile: boolean) {
    copiaLetta.current += 1
    setUndo(visibile)
  }

  useEffect(() => {
    if (!uid) return
    const id = ++copiaLetta.current
    if (!(firebaseEnabled() && !readsLocal())) {
      try {
        if (copiaLetta.current === id) setUndo(leggiCopiaLocale(uid) !== null)
      } catch {
        // una lettura rotta lascia il pulsante nascosto
      }
      return
    }
    void (async () => {
      try {
        const { esisteCopiaCloud } = await import('../data/firebase/ripristinoSicurezza')
        const presente = await esisteCopiaCloud()
        if (copiaLetta.current === id) setUndo(presente)
      } catch {
        // una lettura rotta lascia il pulsante nascosto
      }
    })()
  }, [uid])

  useEffect(() => {
    if (!uid) return
    const id = ++driveLettura.current
    void (async () => {
      try {
        const account = await DriveAuth.leggi()
        if (driveLettura.current === id) {
          setDriveEmail(account.collegato ? account.email ?? 'Google Drive collegato' : null)
        }
      } catch {
        if (driveLettura.current === id) setDriveEmail(null)
      }
    })()
  }, [uid])

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
    if (driveEmail) {
      await inviaDrive()
      return
    }
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
    presaRef.current = false
    try {
      const { leggiRipristino } = await import('../lib/leggiRipristino')
      const esito = await leggiRipristino(new Uint8Array(await file.arrayBuffer()))
      if (esito.esito === 'rifiutato') {
        toast.show(esito.messaggio, 'plain')
        return
      }
      setPending({
        bundle: esito.bundle,
        codici: esito.esito === 'solo-dati' || esito.esito === 'completo' ? esito.codici : null,
        file: esito.esito === 'completo' ? esito.file : [],
      })
    } catch {
      toast.show('File non valido', 'plain')
    }
  }

  async function confirmRestore(modo: 'unisci' | 'sostituisci') {
    if (!uid || !pending) return
    if (modo === 'sostituisci' && parola !== 'SOSTITUISCI') return
    const { impostazioniRipristino } = await import('../lib/leggiRipristino')
    let bundle = {
      ...pending.bundle,
      settings: impostazioniRipristino(
        pending.bundle.settings as Record<string, unknown>,
        settings as unknown as Record<string, unknown>,
      ),
    }
    if (modo === 'unisci') {
      const attuale = firebaseEnabled() && !readsLocal()
        ? await (await import('../data/firebase/client')).loadCloudBackup(uid)
        : buildBackup(uid)
      bundle = {
        ...bundle,
        dogs: unisciRegistri(attuale.dogs, bundle.dogs),
        appointments: unisciRegistri(attuale.appointments, bundle.appointments),
        services: unisciRegistri(attuale.services, bundle.services),
        closures: unisciRegistri(attuale.closures, bundle.closures),
      }
    }
    if (firebaseEnabled() && !readsLocal()) {
      if (restoringRef.current) return
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.show('Connessione assente', 'plain')
        return
      }
      const codici = pending.codici
      const file = pending.file
      restoringRef.current = true
      setRestoring(true)
      try {
        if (!presaRef.current) {
          try {
            const { salvaCopiaCloud } = await import('../data/firebase/ripristinoSicurezza')
            await salvaCopiaCloud(uid, file.map((item) => item.id))
            presaRef.current = true
            pubblicaUndo(true)
          } catch {
            toast.show('Copia di sicurezza non riuscita', 'plain')
            return
          }
        }
        const mod = await import('../data/firebase/client')
        await mod.replaceCloudData(uid, bundle)
        if (modo === 'sostituisci' && codici) {
          const { scriviCodiciCane } = await import('../data/firebase/backupCollect')
          await scriviCodiciCane(codici)
        }
        if (file.length > 0) {
          const { scriviFileRipristino } = await import('../data/firebase/ripristinoFile')
          await scriviFileRipristino(file)
        }
        toast.show('Ripristinato', 'plain')
        setParola('')
        setPending(null)
        pubblicaUndo(true)
      } catch {
        toast.show('Ripristino incompleto, riprova', 'plain')
      } finally {
        restoringRef.current = false
        setRestoring(false)
      }
      return
    }
    if (restoringRef.current) return
    restoringRef.current = true
    setRestoring(true)
    try {
      if (!presaRef.current) {
        try {
          salvaCopiaLocale(uid)
          presaRef.current = true
          pubblicaUndo(true)
        } catch {
          toast.show('Copia di sicurezza non riuscita', 'plain')
          return
        }
      }
      restoreBackup(uid, bundle)
      reload()
      setParola('')
      setPending(null)
      pubblicaUndo(true)
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
    } finally {
      restoringRef.current = false
      setRestoring(false)
    }
  }

  async function annullaRipristino() {
    if (!uid || undoingRef.current) return
    if (firebaseEnabled() && !readsLocal()) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.show('Connessione assente', 'plain')
        return
      }
      undoingRef.current = true
      setUndoing(true)
      try {
        const { leggiCopiaCloud, cancellaCopiaCloud } = await import('../data/firebase/ripristinoSicurezza')
        const copia = await leggiCopiaCloud()
        if (copia === null) {
          pubblicaUndo(false)
          return
        }
        const mod = await import('../data/firebase/client')
        await mod.replaceCloudData(uid, copia.bundle)
        if (copia.codici !== null) {
          const { scriviCodiciCane } = await import('../data/firebase/backupCollect')
          await scriviCodiciCane(copia.codici)
        }
        if (copia.file.length > 0) {
          const { scriviFileRipristino } = await import('../data/firebase/ripristinoFile')
          await scriviFileRipristino(copia.file)
        }
        if (copia.assenti.length > 0) {
          const { eliminaFileDalSalone } = await import('../data/firebase/ripristinoFile')
          await eliminaFileDalSalone(copia.assenti)
        }
        await cancellaCopiaCloud()
        toast.show('Ripristino annullato', 'plain')
        pubblicaUndo(false)
        setPending(null)
        presaRef.current = false
      } catch {
        toast.show('Ripristino incompleto, riprova', 'plain')
      } finally {
        undoingRef.current = false
        setUndoing(false)
      }
      return
    }
    undoingRef.current = true
    setUndoing(true)
    try {
      const copia = leggiCopiaLocale(uid)
      if (copia === null) {
        pubblicaUndo(false)
        return
      }
      restoreBackup(uid, copia)
      reload()
      cancellaCopiaLocale(uid)
      toast.show('Ripristino annullato', 'plain')
      pubblicaUndo(false)
      setPending(null)
      presaRef.current = false
    } catch {
      toast.show('Salvataggio non riuscito', 'plain')
    } finally {
      undoingRef.current = false
      setUndoing(false)
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

  async function exportBackupZip() {
    if (!uid || zipBusy) return
    setZipBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const { backupZip } = await import('../lib/backupZip')
      const raccolto = await raccogliBackup(now, { includiByte: false })
      const registro = await registroXlsx(raccolto.dati, { now })
      const file = await backupZip(raccolto, registro, now)
      if (Capacitor.isNativePlatform()) await shareFiles([file], 'Backup Groomly')
      else downloadAnchor(file.blob, file.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setZipBusy(false)
    }
  }

  async function exportBackupCompleto() {
    if (!uid || completoBusy) return
    setCompletoBusy(true)
    try {
      const now = new Date()
      const { raccogliBackup } = await import('../data/firebase/backupCollect')
      const { registroXlsx } = await import('../lib/registroXlsx')
      const { backupCompleto, cartellaFoto } = await import('../lib/backupCompleto')
      const scritti: string[] = []
      const file: { percorso: string; bytes: Uint8Array }[] = []
      const raccolto = await raccogliBackup(now, {
        includiByte: true,
        onFile: (meta, bytes, percorso) => {
          void meta
          scritti.push(percorso)
          file.push({ percorso, bytes })
        },
      })
      const registro = await registroXlsx(raccolto.dati, { now, risolviLink: (percorso) => cartellaFoto(percorso, scritti) })
      const pronto = await backupCompleto(raccolto, registro, file, now)
      if (Capacitor.isNativePlatform()) await shareFiles([pronto], 'Backup Groomly')
      else downloadAnchor(pronto.blob, pronto.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show('Esportazione non riuscita', 'plain')
    } finally {
      setCompletoBusy(false)
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
    if (uid) void programmaInvio(uid)
  }

  function onFrequenza(frequenza: 'giorno' | 'settimana' | 'mese') {
    update((current) => ({ ...current, backup: { ...current.backup, frequenza } }))
    if (uid) void programmaInvio(uid)
  }

  function onVincolo(campo: 'soloWifi' | 'soloCarica', acceso: boolean) {
    update((current) => ({ ...current, backup: { ...current.backup, [campo]: acceso } }))
    if (uid) void programmaInvio(uid)
  }

  async function collegaDrive() {
    if (driveBusyRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    driveBusyRef.current = true
    setDriveBusy(true)
    try {
      const account = await DriveAuth.collega()
      if (!account.collegato) {
        toast.show('Collegamento Google non riuscito', 'plain')
        return
      }
      driveLettura.current += 1
      setDriveEmail(account.email ?? 'Google Drive collegato')
      toast.show('Google Drive collegato', 'plain')
    } catch (error) {
      if (error instanceof Error && error.message === 'annullato') return
      if (error instanceof Error && error.message === 'telefono') {
        toast.show('Il collegamento a Google Drive funziona sul telefono', 'plain')
        return
      }
      toast.show('Collegamento Google non riuscito', 'plain')
    } finally {
      driveBusyRef.current = false
      setDriveBusy(false)
    }
  }

  async function scollegaDrive() {
    if (driveBusyRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    driveBusyRef.current = true
    setDriveBusy(true)
    try {
      await DriveAuth.scollega()
      driveLettura.current += 1
      setDriveEmail(null)
      toast.show('Google Drive scollegato', 'plain')
    } catch (error) {
      if (error instanceof Error && error.message === 'telefono') {
        toast.show('Il collegamento a Google Drive funziona sul telefono', 'plain')
        return
      }
      toast.show('Collegamento Google non riuscito', 'plain')
    } finally {
      driveBusyRef.current = false
      setDriveBusy(false)
    }
  }

  async function inviaDrive() {
    if (!uid || driveBusyRef.current || invioBusy) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    setInvioBusy(true)
    try {
      await inviaBackupSuDrive(uid, new Date())
      toast.show('Backup inviato su Google Drive', 'plain')
    } catch (error) {
      toast.show(messaggioInvio(error), 'plain')
    } finally {
      setInvioBusy(false)
    }
  }

  function cartellaDelSalone(): string {
    return cartellaBackup(settings.business.salonName || settings.business.name)
  }

  async function apriCopieDrive() {
    if (copieBusy) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    setCopieBusy(true)
    try {
      const lista = await elencoCopie(cartellaDelSalone())
      if (lista.length === 0) {
        toast.show('Nessun backup su Drive', 'plain')
        return
      }
      setCopie(lista)
    } catch (error) {
      toast.show(messaggioRipristinoDrive(error), 'plain')
    } finally {
      setCopieBusy(false)
    }
  }

  async function scegliCopiaDrive(copia: DriveCopia) {
    if (copieBusy) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show('Connessione assente', 'plain')
      return
    }
    setCopieBusy(true)
    try {
      const bytes = await leggiCopia(cartellaDelSalone(), copia.id)
      const blob = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer])
      setCopie(null)
      await onRestoreFile(new File([blob], copia.nome, { type: 'application/zip' }))
    } catch (error) {
      toast.show(messaggioRipristinoDrive(error), 'plain')
    } finally {
      setCopieBusy(false)
    }
  }

  const counts = pending ? backupCounts(pending.bundle) : null
  const empty = businessEmpty(settings.business)
  const headline = businessHeadline(settings.business)
  const driveStato = uid ? statoDrive({
    ultimo: localStorage.getItem(`groomly.users.${uid}.driveUltimoInvio`),
    errore: localStorage.getItem(chiaveErroreDrive(uid)) !== null,
    frequenza: settings.backup.frequenza,
    now: new Date(),
  }) : null
  const backupLabel = driveStato?.testo ?? backupStatusLabel(settings.backup.lastAt)
  const backupTone = driveStato?.tono ?? 'ok'
  const now = new Date()
  const report = reportOf(visibleAppointments(appointments, earningsViewer(account)), dogs, services, 'mese', now)
  const hidden = settings.ui.hideAmounts
  const badge = reportBadgeVisible(settings.ui.reportBadgeSince, now)
  const delta = report.confronto.delta
  const collaboratore = account?.role === 'collaboratore'

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
          {collaboratore ? null : (
            <SRow style={{ borderTop: 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {empty ? <span style={{ fontWeight: 600, ...USER_TEXT }}>Aggiungi</span> : (
                  <>
                    <div style={{ fontWeight: 600, ...USER_TEXT }}>{headline.title}</div>
                    {headline.detail ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{headline.detail}</span>
                        {settings.business.vatNumber.trim() ? (
                          <button type="button" onClick={() => void copyVat()} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '10px 0', flex: 'none' }}>Copia</button>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <IconButton label="Modifica attività" onClick={openBusiness}><Pencil size={16} strokeWidth={2} aria-hidden /></IconButton>
            </SRow>
          )}
          <SRow style={{
            ...(collaboratore ? { borderTop: 'none' } : {}),
            ...(badge ? { background: 'linear-gradient(90deg, var(--pri-s) 0%, var(--card) 70%)' } : {}),
          }}>
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

        {collaboratore || voce === 'nascosta' ? null : (
          <>
            <SectionTitle>{voce === 'team' ? it.team : 'Piano Pro'}</SectionTitle>
            <Card>
              <SRow style={{ borderTop: 'none' }}>
                <Link to={voce === 'team' ? '/impostazioni/team' : '/impostazioni/pro'} style={{ ...menuLink, minHeight: 44 }}>
                  <MenuIcon tone="prim"><Sparkles size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={voce === 'team' ? it.team : 'Funzioni Pro'} detail="Invita un socio o un collaboratore" />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
            </Card>
          </>
        )}

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

        {collaboratore ? null : (
        <>
        <SectionTitle>Dati</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" aria-label={`Backup. ${backupLabel}. ${settings.backup.autoDaily ? 'Automatico acceso' : 'Automatico spento'}${driveEmail ? `. ${driveEmail}` : ''}`} onClick={() => setBackupOpen(true)} style={rowButton}>
              <MenuIcon tone="ok"><Cloud size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span>Backup</span>
                <small style={{ color: 'var(--tx3)' }}>
                  {settings.backup.autoDaily ? 'Automatico acceso' : 'Automatico spento'}
                </small>
                {driveEmail ? <span style={{ color: 'var(--tx2)', fontSize: TYPE.meta, ...USER_TEXT }}>{driveEmail}</span> : null}
              </span>
              <StatusPill tone={backupTone}>{backupLabel}</StatusPill>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          {undo ? (
            <SRow>
              <Button variant="secondary" onClick={() => { void annullaRipristino() }} disabled={restoring || undoing} style={{ flex: 1 }}>
                Annulla ripristino
              </Button>
            </SRow>
          ) : null}
          <input
            ref={restoreRef}
            aria-label="Scegli backup"
            type="file"
            accept="application/json,.json,application/zip,.zip"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void onRestoreFile(file)
            }}
          />
        </Card>
        </>
        )}

        <SectionTitle>Personalizza</SectionTitle>
        <Card>
          {collaboratore ? null : (
          <>
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
          </>
          )}
          <SRow style={collaboratore ? { borderTop: 'none' } : undefined}>
            <Link to="/impostazioni/notifiche" style={{ ...menuLink, minHeight: 44 }}>
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
        {menuPiani ? (
          <PianoCard
            livello={piano.stato.livello}
            provaUsata={piano.provaUsata}
            onProva={() => piano.apriPaywall('prenotazioni')}
            onApri={() => navigate('/impostazioni/piano')}
          />
        ) : null}
        <Card>
          {vociMenuPiani(menuPiani).map((voce) => (
            <SRow key={voce} style={{ borderTop: 'none' }}>
              <Link to={hrefVoce(voce)} style={menuLink}>{voce}</Link>
            </SRow>
          ))}
        </Card>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" onClick={() => setLogoutOpen(true)} style={{ ...rowButton, color: 'var(--bad)', fontWeight: 700 }}>
              <LogOut size={16} strokeWidth={2} aria-hidden />
              Esci
            </button>
          </SRow>
        </Card>
      </div>

      <Dialog open={businessOpen} title="Attività" onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label="Partita IVA" value={businessDraft.vatNumber} error={businessErrors.vat ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Nome toelettatura" value={businessDraft.salonName} onChange={(event) => setBusinessDraft({ ...businessDraft, salonName: event.target.value })} />
        <Input label="Codice fiscale" value={businessDraft.taxCode} autoCapitalize="characters" error={businessErrors.taxCode ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, taxCode: event.target.value })} />
        <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Basta la partita IVA oppure il codice fiscale.</small>
        <Input label="Telefono" value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label="Indirizzo" value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <OrariEditor mostra={piano.mostraPiani} orari={settings.orari} onChange={(orari) => save({ ...settings, orari })} />
        {piano.mostraPiani ? <Input label={it.linkRecensioni} value={settings.linkRecensioni ?? ''} onChange={(event) => save({ ...settings, linkRecensioni: event.target.value })} /> : null}
        <Button onClick={saveBusiness}>Salva</Button>
      </Dialog>
      <Dialog open={backupOpen} title="Backup" onClose={() => setBackupOpen(false)}>
        <StatusPill tone={backupTone}>{backupLabel}</StatusPill>
        <GroupLabel>Copia aggiornata</GroupLabel>
        <BackupAction label="Salva ora" detail="JSON sul telefono e copia sul cloud" tone="ok" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void runBackup() }} />
        <CopieCloudRiga mostraPiani={piano.mostraPiani} stato={piano.stato} bucket={null} onPaywall={() => piano.apriPaywall('copieCloud')} />
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1 }}>
            <span>Automatico</span>
            <small style={{ display: 'block', color: 'var(--tx3)' }}>{settings.backup.autoDaily ? 'Automatico acceso' : 'Automatico spento'}</small>
          </span>
          <Toggle checked={settings.backup.autoDaily} label="Backup automatico giornaliero" onChange={onAuto} />
        </SRow>
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1 }}>Frequenza</span>
          <Segmented label="Frequenza del backup" value={settings.backup.frequenza ?? 'giorno'} onChange={onFrequenza} options={[
            { value: 'giorno', label: 'Giorno' },
            { value: 'settimana', label: 'Settimana' },
            { value: 'mese', label: 'Mese' },
          ]} />
        </SRow>
        <SRow>
          <span style={{ flex: 1 }}>Solo Wi-Fi</span>
          <Toggle checked={settings.backup.soloWifi !== false} label="Solo Wi-Fi" onChange={(acceso) => onVincolo('soloWifi', acceso)} />
        </SRow>
        <SRow>
          <span style={{ flex: 1 }}>Solo in carica</span>
          <Toggle checked={settings.backup.soloCarica === true} label="Solo in carica" onChange={(acceso) => onVincolo('soloCarica', acceso)} />
        </SRow>
        {driveEmail ? (
          <>
            <BackupAction label="Scollega" detail="Google Drive collegato" tone="prim" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void scollegaDrive() }} disabled={driveBusy} />
            <BackupAction label="Invia su Drive" detail="Manda la copia di oggi" tone="prim" icon={<Upload size={13} strokeWidth={2} aria-hidden />} onClick={() => { void inviaDrive() }} disabled={driveBusy || invioBusy} busy={invioBusy} />
          </>
        ) : (
          <BackupAction label="Collega Google Drive" detail="Non collegato" tone="prim" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void collegaDrive() }} disabled={driveBusy} />
        )}
        <GroupLabel>Un file da tenere</GroupLabel>
        <BackupAction label="Registro Excel" detail="Solo il foglio del registro" tone="prim" icon={<FileSpreadsheet size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportRegistro() }} disabled={registroBusy} busy={registroBusy} />
        <BackupAction label="ZIP senza foto" detail="Dati e registro" tone="prim" icon={<FileArchive size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportBackupZip() }} disabled={zipBusy} busy={zipBusy} />
        <BackupAction label="Completo con foto" detail="Dati, registro e foto" tone="prim" icon={<Image size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportBackupCompleto() }} disabled={completoBusy} busy={completoBusy} />
        <BackupAction label="Copia veloce" detail="Zip di cani, agenda e servizi" tone="prim" icon={<Download size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportZip() }} />
        <GroupLabel>Se qualcosa va storto</GroupLabel>
        <BackupAction label="Ripristina da un file" detail="Sostituisce i dati di questo salone" tone="warn" icon={<Upload size={13} strokeWidth={2} aria-hidden />} onClick={() => restoreRef.current?.click()} />
        {driveEmail ? (
          <BackupAction label="Ripristina da Drive" detail="Una delle copie su Google Drive" tone="warn" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void apriCopieDrive() }} disabled={copieBusy} busy={copieBusy} />
        ) : null}
      </Dialog>
      <Dialog open={tagsOpen} title="Tag dei cani" onClose={() => setTagsOpen(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.5 }}>
          Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.
        </p>
        <SuggestionList label="Tag" addLabel="Aggiungi tag" values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
      </Dialog>
      <Dialog open={copie !== null} title="Copie su Drive" onClose={() => { if (!copieBusy) setCopie(null) }}>
        {copie?.map((copia) => {
          const etichetta = etichettaCopia(copia.giorno, copia.nome)
          return (
            <BackupAction key={copia.id} label={etichetta} detail="Sostituisce i dati di questo salone" tone="warn" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void scegliCopiaDrive(copia) }} disabled={copieBusy} busy={copieBusy} />
          )
        })}
      </Dialog>
      <Dialog open={pending !== null} title="Ripristina" onClose={() => { setParola(''); setPending(null) }}>
        <p style={{ margin: 0 }}>{counts ? `${counts.dogs} cani, ${counts.appointments} appuntamenti, ${counts.services} servizi` : ''}</p>
        <p style={{ margin: 0 }}>Sostituisce i dati di questo salone.</p>
        <p style={{ margin: 0 }}>Unisci aggiunge e aggiorna, senza cancellare.</p>
        <Button onClick={() => { void confirmRestore('unisci') }} disabled={restoring}>Unisci</Button>
        <Input label="Per sostituire tutto" value={parola} onChange={(event) => setParola(event.target.value)} />
        <Button variant="bad" onClick={() => { void confirmRestore('sostituisci') }} disabled={restoring || parola !== 'SOSTITUISCI'}>Ripristina</Button>
        <Button variant="secondary" onClick={() => { setParola(''); setPending(null) }}>Annulla</Button>
      </Dialog>
      <Dialog open={logoutOpen} title="Uscire da Groomly?" onClose={() => setLogoutOpen(false)}>
        <Button variant="secondary" onClick={() => setLogoutOpen(false)}>Resta</Button>
        <Button variant="bad" onClick={() => session.logout()}>Esci</Button>
      </Dialog>
    </ShellFrame>
  )
}
