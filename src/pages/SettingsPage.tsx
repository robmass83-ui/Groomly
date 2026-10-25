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
import { getSettings, segnaBadgeReport, type SettingsMain } from '../data/local/settings'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { PianoCard } from '../components/piano/PianoCard'
import { CopieCloudRiga } from '../components/piano/CopieCloudRiga'
import { OrariEditor } from '../components/piano/OrariEditor'
import { usePiano } from '../hooks/usePiano'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { meseCorto } from '../i18n/format'
import type { Lingua } from '../i18n/lingua'
import { puoScrivereLinguaClienti } from '../i18n/scritturaLingua'
import { haAccesso } from '../lib/piano'
import { voceTeam } from '../lib/salonAccess'
import { hrefVoce, VOCE_ELIMINA, VOCE_MESSAGGI, VOCE_PIANO, VOCE_PRIVACY, VOCE_STRUMENTI, vociMenuPiani } from '../lib/vociMenu'
import { useSettings } from '../hooks/useSettings'
import { backupCounts, backupDay, backupFilename, backupStatusLabel, buildBackup, buildExportZip, isEmptyBackup, restoreBackup, triggerDownload, type BackupBundle } from '../lib/backupDoc'
import type { FileRipristino } from '../lib/leggiRipristino'
import type { CodiciCaneDoc } from '../lib/codiceCane'
import { APP_VERSION } from '../lib/appVersion'
import { aggiornamentiApkAttivi, linkLegale } from '../lib/distribuzione'
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

function etichettaBackup(lastAt: string | undefined, now: Date, lingua: Lingua, mai: string, oggi: string): string {
  if (!lastAt) return mai
  const date = new Date(lastAt)
  if (Number.isNaN(date.getTime())) return mai
  const stessoGiorno = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
  if (stessoGiorno) {
    const ora = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return oggi.replace('{{ora}}', ora)
  }
  return `${date.getDate()} ${meseCorto(lingua, date)} ${date.getFullYear()}`
}

function etichettaVoce(voce: string, testi: { privacy: string; eliminaAccount: string; tuoPiano: string; team: string; messaggi: string; strumenti: string }): string {
  if (voce === VOCE_PRIVACY) return testi.privacy
  if (voce === VOCE_ELIMINA) return testi.eliminaAccount
  if (voce === VOCE_PIANO) return testi.tuoPiano
  if (voce === 'Team') return testi.team
  if (voce === VOCE_MESSAGGI) return testi.messaggi
  if (voce === VOCE_STRUMENTI) return testi.strumenti
  return voce
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
  const { dogs, settled: dogsSettled } = useDogs(uid ?? '')
  const { appointments, synced } = useAppointments(uid ?? '')
  const attesaCifre = firebaseEnabled() && (!ready || !synced || !dogsSettled)
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
  const [eliminaOpen, setEliminaOpen] = useState(false)
  const restoreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!ready) return
    if (!uid) return
    const current = firebaseEnabled() && !readsLocal() ? settings : getSettings(uid)
    if (!segnaBadgeReport(account?.role, current.updatedAt, current.ui.reportBadgeSince)) return
    save({ ...current, ui: { ...current.ui, reportBadgeSince: localDayKey(new Date()) } })
  }, [ready, uid, settings, save, account?.role])

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
    if (!choose(theme)) toast.show(frasi.authSalvataggio, 'plain')
  }

  function update(recipe: (current: SettingsMain) => SettingsMain) {
    if (!uid) return false
    const source = firebaseEnabled() && !readsLocal() ? settings : getSettings(uid)
    const ok = save(recipe(source))
    if (!ok) toast.show(frasi.authSalvataggio, 'plain')
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
      toast.show('Copia scaricata: groomly-export.zip', 'plain')
    } catch {
      toast.show(frasi.authSalvataggio, 'plain')
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
      toast.show(frasi.authSalvataggio, 'plain')
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
        toast.show(frasi.impConnessione, 'plain')
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
      toast.show(frasi.authSalvataggio, 'plain')
    } finally {
      restoringRef.current = false
      setRestoring(false)
    }
  }

  async function annullaRipristino() {
    if (!uid || undoingRef.current) return
    if (firebaseEnabled() && !readsLocal()) {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        toast.show(frasi.impConnessione, 'plain')
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
      toast.show(frasi.authSalvataggio, 'plain')
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
      else toast.show(frasi.lisExportKo, 'plain')
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
      if (Capacitor.isNativePlatform()) await shareFiles([file], frasi.impBackupNome)
      else downloadAnchor(file.blob, file.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show(frasi.lisExportKo, 'plain')
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
      if (Capacitor.isNativePlatform()) await shareFiles([pronto], frasi.impBackupNome)
      else downloadAnchor(pronto.blob, pronto.name)
    } catch (error) {
      if (isShareCancel(error)) return
      if (error instanceof AppError && error.code === 'backup_offline') toast.show(error.message, 'plain')
      else toast.show(frasi.lisExportKo, 'plain')
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
      toast.show(frasi.impConnessione, 'plain')
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
      toast.show(frasi.impConnessione, 'plain')
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
      toast.show(frasi.impConnessione, 'plain')
      return
    }
    setInvioBusy(true)
    try {
      await inviaBackupSuDrive(uid, new Date())
      toast.show(frasi.impBackupInviato, 'plain')
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
      toast.show(frasi.impConnessione, 'plain')
      return
    }
    setCopieBusy(true)
    try {
      const lista = await elencoCopie(cartellaDelSalone())
      if (lista.length === 0) {
        toast.show(frasi.impNessunDrive, 'plain')
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
      toast.show(frasi.impConnessione, 'plain')
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
  const backupTone = driveStato?.tono ?? 'ok'
  const now = new Date()
  const report = reportOf(visibleAppointments(appointments, earningsViewer(account)), dogs, services, 'mese', now)
  const hidden = settings.ui.hideAmounts
  const badge = reportBadgeVisible(settings.ui.reportBadgeSince, now)
  const delta = report.confronto.delta
  const collaboratore = account?.role === 'collaboratore'
  const { lingua, scegli } = useLingua()
  const frasi = useFrasi()
  const backupGrezzo = backupStatusLabel(settings.backup.lastAt, now)
  const backupLabel = driveStato?.testo ?? (lingua === 'it' ? backupGrezzo : etichettaBackup(settings.backup.lastAt, now, lingua, frasi.impMai, frasi.impOggiCompletato))
  const opzioniLingua: { value: Lingua; label: string }[] = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ]
  function onLinguaClienti(prossima: Lingua) {
    if (!puoScrivereLinguaClienti(account?.role ?? '')) return
    if (!save({ ...settings, linguaClienti: prossima })) toast.show(frasi.authSalvataggio, 'plain')
  }

  return (
    <ShellFrame>
      <Header title={frasi.navImpostazioni} />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {isOperator(email) ? (
          <>
            <SectionTitle>Groomly</SectionTitle>
            <Card>
              <SRow style={{ borderTop: 'none' }}>
                <Link to="/impostazioni/utenti" style={menuLink}>
                  <MenuIcon tone="prim"><Users size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={frasi.uteTitolo} />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
            </Card>
          </>
        ) : null}
        <SectionTitle>{frasi.impAttivita}</SectionTitle>
        <Card>
          {collaboratore ? null : (
            <SRow style={{ borderTop: 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {!ready ? <span style={{ fontWeight: 600, ...USER_TEXT }}>…</span> : empty ? <span style={{ fontWeight: 600, ...USER_TEXT }}>{frasi.homeAggiungi}</span> : (
                  <>
                    <div style={{ fontWeight: 600, ...USER_TEXT }}>{headline.title}</div>
                    {headline.detail ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{headline.detail}</span>
                        {settings.business.vatNumber.trim() ? (
                          <button type="button" onClick={() => void copyVat()} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '10px 0', flex: 'none' }}>{frasi.impCopia}</button>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <IconButton label={frasi.impModifica} onClick={openBusiness}><Pencil size={16} strokeWidth={2} aria-hidden /></IconButton>
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
                  {frasi.impIncassi}
                  {badge ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-pri)', background: 'var(--pri-solid)', borderRadius: 999, padding: '1px 6px' }}>{frasi.impNuovo}</span>
                  ) : null}
                </span>
                <small style={{ color: 'var(--tx2)', fontSize: TYPE.meta }}>
                  {attesaCifre ? '…' : <>{reportMonth(report.titolo)} <b>{maskEuro(report.incassato, hidden)}</b></>}
                  {!attesaCifre && delta !== null && !hidden ? (
                    <span style={{ color: delta < 0 ? 'var(--bad)' : 'var(--ok)', fontWeight: 700, whiteSpace: 'nowrap' }}>
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
            <SectionTitle>{voce === 'team' ? frasi.team : frasi.impPiano}</SectionTitle>
            <Card>
              <SRow style={{ borderTop: 'none' }}>
                <Link to={voce === 'team' ? '/impostazioni/team' : '/impostazioni/pro'} style={{ ...menuLink, minHeight: 44 }}>
                  <MenuIcon tone="prim"><Sparkles size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={voce === 'team' ? frasi.team : frasi.impFunzioni} detail={frasi.impInvita} />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
            </Card>
          </>
        )}

        <SectionTitle>{frasi.impAspetto}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>{frasi.impTema}</span>
            <Segmented label={frasi.impTema} value={theme} onChange={onTheme} options={[
              { value: 'light', label: frasi.impChiaro },
              { value: 'dark', label: frasi.impScuro },
              { value: 'auto', label: frasi.impAuto },
            ]} />
          </SRow>
          <SRow>
            <span style={{ flex: 1 }}>{frasi.linguaTua}</span>
            <Segmented label={frasi.linguaTua} value={lingua} onChange={scegli} options={opzioniLingua} />
          </SRow>
          {puoScrivereLinguaClienti(account?.role ?? '') ? (
            <SRow>
              <span style={{ flex: 1 }}>{frasi.linguaDeiClienti}</span>
              <Segmented label={frasi.linguaDeiClienti} value={settings.linguaClienti ?? 'it'} onChange={onLinguaClienti} options={opzioniLingua} />
            </SRow>
          ) : null}
        </Card>

        {collaboratore ? null : (
        <>
        <SectionTitle>{frasi.impDati}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" aria-label={`Backup. ${backupLabel}. ${settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}${driveEmail ? `. ${driveEmail}` : ''}`} onClick={() => setBackupOpen(true)} style={rowButton}>
              <MenuIcon tone="ok"><Cloud size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <span>Backup</span>
                <small style={{ color: 'var(--tx3)' }}>
                  {settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}
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

        <SectionTitle>{frasi.impPersonalizza}</SectionTitle>
        <Card>
          {collaboratore ? null : (
          <>
          <SRow style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/servizi" style={menuLink}>
              <MenuIcon tone="prim"><Scissors size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.impServizi} detail={activeCount === 1 ? frasi.impServizioUno : frasi.impServiziN.replace('{{n}}', String(activeCount))} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          <SRow>
            <button type="button" onClick={() => setTagsOpen(true)} style={rowButton}>
              <MenuIcon tone="warn"><Tag size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody
                title={frasi.impTag}
                detail={settings.tagSuggestions.length === 0
                  ? frasi.impTagNessuno
                  : settings.tagSuggestions.length === 1
                    ? frasi.impTagUno
                    : frasi.impTagN.replace('{{n}}', String(settings.tagSuggestions.length))}
              />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
            <Link to="/impostazioni/archivio" style={menuLink}>
              <MenuIcon tone="prim"><Archive size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.impArchivio} detail={attesaCifre ? '…' : frasi.impArchivioN.replace('{{n}}', String(archived))} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          </>
          )}
          <SRow style={collaboratore ? { borderTop: 'none' } : undefined}>
            <Link to="/impostazioni/notifiche" style={{ ...menuLink, minHeight: 44 }}>
              <MenuIcon tone="prim"><Bell size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody
                title={frasi.impNotifiche}
                detail={`${settings.monthlyReminder.enabled
                  ? frasi.impPromemoriaAlle.replace('{{ora}}', settings.monthlyReminder.time)
                  : frasi.impPromemoriaSpento} · ${pushPrefs.enabled ? frasi.impPushAccese : frasi.impPushSpente}`}
              />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <a href={linkLegale('privacy', lingua)} style={menuLink}>Privacy</a>
          </SRow>
          <SRow>
            <a href={linkLegale('termini', lingua)} style={menuLink}>{frasi.impTermini}</a>
          </SRow>
          <SRow>
            <a href={linkLegale('dpa', lingua)} style={menuLink}>{frasi.impDpa}</a>
          </SRow>
          <SRow>
            <a href={linkLegale('elimina-account', lingua)} style={menuLink}>{frasi.impComeEliminare}</a>
          </SRow>
          <SRow>
            <button type="button" aria-pressed={settings.consensoMetriche === true} onClick={() => save({ ...settings, consensoMetriche: settings.consensoMetriche !== true })} style={rowButton}>{frasi.metriche}</button>
          </SRow>
          <SRow>
            <button type="button" onClick={() => setEliminaOpen(true)} style={{ ...rowButton, color: 'var(--bad)', fontWeight: 700 }}>{frasi.eliminaAccount}</button>
          </SRow>
        </Card>

        <div style={{ textAlign: 'center' }}>
          {aggiornamentiApkAttivi() ? (
            <button
              type="button"
              onClick={() => navigate('/impostazioni/aggiornamenti')}
              aria-label={frasi.impStorico.replace('{{versione}}', APP_VERSION)}
              style={{ minHeight: 44, border: 0, background: 'transparent', color: 'var(--tx3)', font: 'inherit' }}
            >
              {`Groomly ${APP_VERSION}`}
            </button>
          ) : (
            <p style={{ margin: 0, minHeight: 44, color: 'var(--tx3)' }}>{`Groomly ${APP_VERSION}`}</p>
          )}
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
              <Link to={hrefVoce(voce)} style={menuLink}>{etichettaVoce(voce, frasi)}</Link>
            </SRow>
          ))}
        </Card>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" onClick={() => setLogoutOpen(true)} style={{ ...rowButton, color: 'var(--bad)', fontWeight: 700 }}>
              <LogOut size={16} strokeWidth={2} aria-hidden />
              {frasi.impEsci}
            </button>
          </SRow>
        </Card>
      </div>

      <Dialog open={businessOpen} title={frasi.impAttivita} onClose={() => setBusinessOpen(false)}>
        <Input label="Ragione sociale" value={businessDraft.name} onChange={(event) => setBusinessDraft({ ...businessDraft, name: event.target.value })} />
        <Input label={frasi.authIva} value={businessDraft.vatNumber} error={businessErrors.vat ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, vatNumber: event.target.value })} />
        <Input label="Nome toelettatura" value={businessDraft.salonName} onChange={(event) => setBusinessDraft({ ...businessDraft, salonName: event.target.value })} />
        <Input label="Codice fiscale" value={businessDraft.taxCode} autoCapitalize="characters" error={businessErrors.taxCode ?? undefined} onChange={(event) => setBusinessDraft({ ...businessDraft, taxCode: event.target.value })} />
        <small style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>Basta la partita IVA oppure il codice fiscale.</small>
        <Input label={frasi.schedaTelefono} value={businessDraft.phone} onChange={(event) => setBusinessDraft({ ...businessDraft, phone: event.target.value })} />
        <Input label={frasi.authIndirizzo} value={businessDraft.address} onChange={(event) => setBusinessDraft({ ...businessDraft, address: event.target.value })} />
        <OrariEditor mostra={piano.mostraPiani} orari={settings.orari} onChange={(orari) => save({ ...settings, orari })} />
        {piano.mostraPiani ? <Input label={frasi.linkRecensioni} value={settings.linkRecensioni ?? ''} onChange={(event) => save({ ...settings, linkRecensioni: event.target.value })} /> : null}
        {piano.mostraPiani ? (
          <button type="button" onClick={() => {
            if (!haAccesso(piano.stato, 'prenotazioni')) {
              piano.apriPaywall('prenotazioni')
              return
            }
            void import('../data/firebase/client').then((mod) => mod.callPubblicaSalone(settings.business.salonName)).catch((error: unknown) => {
              toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
            })
          }}>{frasi.pubblicaPagina}</button>
        ) : null}
        {piano.mostraPiani ? <button type="button" aria-pressed={settings.fedeltaAccesa === true} onClick={() => save({ ...settings, fedeltaAccesa: settings.fedeltaAccesa !== true })}>{frasi.tesseraFedelta}</button> : null}
        <Button onClick={saveBusiness}>{frasi.schedaSalva}</Button>
      </Dialog>
      <Dialog open={backupOpen} title={frasi.impBackupTitolo} onClose={() => setBackupOpen(false)}>
        <StatusPill tone={backupTone}>{backupLabel}</StatusPill>
        <GroupLabel>Copia aggiornata</GroupLabel>
        <BackupAction label="Salva ora" detail="JSON sul telefono e copia sul cloud" tone="ok" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void runBackup() }} />
        <CopieCloudRiga mostraPiani={piano.mostraPiani} stato={piano.stato} bucket={null} onPaywall={() => piano.apriPaywall('copieCloud')} />
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1 }}>
            <span>Automatico</span>
            <small style={{ display: 'block', color: 'var(--tx3)' }}>{settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}</small>
          </span>
          <Toggle checked={settings.backup.autoDaily} label={frasi.impBackupAuto} onChange={onAuto} />
        </SRow>
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1 }}>Frequenza</span>
          <Segmented label="Frequenza del backup" value={settings.backup.frequenza ?? 'giorno'} onChange={onFrequenza} options={[
            { value: 'giorno', label: frasi.agendaGiorno },
            { value: 'settimana', label: frasi.agendaSettimana },
            { value: 'mese', label: frasi.agendaMese },
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
      <Dialog open={tagsOpen} title={frasi.impTag} onClose={() => setTagsOpen(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.base, lineHeight: 1.5 }}>
          Queste parole compaiono quando, sulla scheda di un cane, premi + Tag. Servono per ricordare qualcosa dell’animale, per esempio ipoallergenico. Un tag scritto sulla scheda entra anche qui. Toglierlo da qui non lo cancella dalle schede dove è già messo.
        </p>
        <SuggestionList label="Tag" addLabel={frasi.impAggiungiTag} values={settings.tagSuggestions} onAdd={(value) => addSuggestion('tagSuggestions', value)} onRemove={(value) => removeSuggestion('tagSuggestions', value)} />
      </Dialog>
      <Dialog open={copie !== null} title="Copie su Drive" onClose={() => { if (!copieBusy) setCopie(null) }}>
        {copie?.map((copia) => {
          const etichetta = etichettaCopia(copia.giorno, copia.nome)
          return (
            <BackupAction key={copia.id} label={etichetta} detail="Sostituisce i dati di questo salone" tone="warn" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void scegliCopiaDrive(copia) }} disabled={copieBusy} busy={copieBusy} />
          )
        })}
      </Dialog>
      <Dialog open={pending !== null} title={frasi.caniRipristina} onClose={() => { setParola(''); setPending(null) }}>
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
      <Dialog open={eliminaOpen} title={frasi.eliminaAccount} onClose={() => setEliminaOpen(false)}>
        <p style={{ margin: 0 }}>
          {account?.role === 'collaboratore' || (account?.role === 'socio' && account.salonId !== account.uid)
            ? frasi.impCancellaAccesso
            : frasi.impCancellaSalone}
        </p>
        <Button variant="secondary" onClick={() => setEliminaOpen(false)}>Annulla</Button>
        <Button variant="bad" onClick={() => { void (async () => {
          try {
            const mod = await import('../data/firebase/client')
            await mod.callEliminaAccount()
            session.logout()
          } catch (error) {
            toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
          } finally {
            setEliminaOpen(false)
          }
        })() }}>{frasi.confermaElimina}</Button>
      </Dialog>
    </ShellFrame>
  )
}
