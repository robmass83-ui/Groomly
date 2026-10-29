import { Capacitor } from '@capacitor/core'
import { Archive, Bell, BookOpen, Check, ChevronRight, Cloud, Download, FileArchive, FileSpreadsheet, Image, Info, Languages, Lightbulb, LogOut, Palette, Pencil, Scale, Scissors, Upload, UserRound, Users, Wallet, Wrench } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { ShellFrame } from './ShellFrame'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Info as InfoButton } from '../components/ui/Info'
import { Card, Row } from '../components/ui/Card'
import { Anello } from '../components/impostazioni/Anello'
import { Chip } from '../components/ui/Chip'
import { IconButton } from '../components/ui/IconButton'
import { IconTile } from '../components/ui/IconTile'
import { Input } from '../components/ui/Input'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Segmented } from '../components/ui/Segmented'
import { StatusPill } from '../components/ui/StatusPill'
import { Toggle } from '../components/ui/Toggle'
import { AppError } from '../data/errors'
import { firebaseEnabled, readsLocal } from '../data/firebase/enabled'
import { getSettings, segnaBadgeReport, type SettingsMain } from '../data/local/settings'
import { backupImpostato, conBackupImpostato } from '../lib/backupImpostato'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { usePushPrefs } from '../hooks/usePushPrefs'
import { useServices } from '../hooks/useServices'
import { useSession } from '../hooks/useSession'
import { CopieCloudRiga } from '../components/piano/CopieCloudRiga'
import { usePiano } from '../hooks/usePiano'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { meseCorto } from '../i18n/format'
import type { Lingua } from '../i18n/lingua'
import { funzioneVisibile } from '../lib/funzioniPiano'
import { voceTeam } from '../lib/salonAccess'
import { useFileSrc } from '../hooks/useFileSrc'
import { useSettings } from '../hooks/useSettings'
import { codaDomani } from '../lib/codaAvvisi'
import { formaLogo, riquadroLogo } from '../lib/logoForma'
import { orariCompilati } from '../lib/orari'
import { avanzamentoSalone, passiCompletamento, type PassoSalone } from '../lib/completaSalone'
import { fiscalNoticeVisible } from '../lib/profile'
import { MOSTRA_INVITO_COLLEGA } from '../lib/invitoCollega'
import { backupCounts, backupStatusLabel, buildBackup, buildExportZip, restoreBackup, triggerDownload, type BackupBundle } from '../lib/backupDoc'
import type { FileRipristino } from '../lib/leggiRipristino'
import type { CodiciCaneDoc } from '../lib/codiceCane'
import { APP_VERSION } from '../lib/appVersion'
import { aggiornamentiApkAttivi } from '../lib/distribuzione'
import { DriveAuth, type DriveCopia } from '../lib/driveAuth'
import { inviaBackupSuDrive, messaggioInvio, programmaInvio } from '../lib/driveInvio'
import { chiaveErroreDrive, statoDrive } from '../lib/statoDrive'
import { unisciRegistri } from '../lib/unisciBackup'
import { cartellaBackup, elencoCopie, etichettaCopia, leggiCopia, messaggioRipristinoDrive } from '../lib/driveRipristino'
import { cancellaCopiaLocale, leggiCopiaLocale, salvaCopiaLocale } from '../lib/ripristinoSicurezza'
import { localDayKey } from '../lib/appointments'
import { reportBadgeVisible } from '../lib/earnings'
import { isOperator } from '../lib/salonPath'
import { downloadAnchor, isShareCancel, shareFiles } from '../lib/shareFile'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import type { ThemeChoice } from '../theme/theme'

const scorciatoia = {
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  gap: 6,
  minHeight: 72,
  padding: 10,
  borderRadius: 12,
  border: '1px solid var(--line)',
  background: 'var(--card)',
  boxShadow: 'var(--sh-2)',
  color: 'inherit',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: 13,
}

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

function SceltaLista<T extends string>({ label, value, onChange, options }: {
  label: string
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            style={{
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 12,
              border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
              background: selected ? 'var(--pri-s)' : 'var(--surf)',
              color: 'var(--tx)',
              font: 'inherit',
              fontWeight: 650,
              padding: '0 12px',
              textAlign: 'left',
            }}
          >
            <span style={{ flex: 1 }}>{option.label}</span>
            {selected ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
          </button>
        )
      })}
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

function businessHeadline(business: SettingsMain['business'], iva: string): { title: string; detail: string } {
  const salon = business.salonName.trim()
  const legal = business.name.trim()
  const title = salon || legal
  const parts: string[] = []
  if (salon && legal) parts.push(legal)
  if (business.vatNumber.trim()) parts.push(`${iva} ${business.vatNumber.trim()}`)
  else if (business.taxCode.trim()) parts.push(business.taxCode.trim())
  return { title, detail: parts.join(' · ') }
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

export function SettingsPage() {
  const session = useSession()
  const piano = usePiano()
  const voce = voceTeam(piano.mostraPiani, piano.stato)
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const uid = account?.uid ?? null
  const email = account?.email ?? null
  const { settings, theme, choose, save, reload, ready } = useSettings()
  const logoSrc = useFileSrc(settings.priceSheet?.intestazione.logo, 'full')
  const toast = useToast()
  const { prefs: pushPrefs } = usePushPrefs(uid ?? '')
  const { services } = useServices(uid ?? '')
  const { dogs, settled: dogsSettled } = useDogs(uid ?? '')
  const { appointments, synced } = useAppointments(uid ?? '')
  const attesaCifre = firebaseEnabled() && (!ready || !synced || !dogsSettled)
  const activeCount = uid ? services.filter((service) => service.active).length : 0
  const archived = dogs.filter((dog) => dog.status === 'non_in_cura' || dog.status === 'deceduto').length
  const navigate = useNavigate()
  const location = useLocation()
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
  const [driveProposta, setDriveProposta] = useState<string | null>(null)
  const [driveBusy, setDriveBusy] = useState(false)
  const [invioBusy, setInvioBusy] = useState(false)
  const [parola, setParola] = useState('')
  const [copie, setCopie] = useState<DriveCopia[] | null>(null)
  const [copieBusy, setCopieBusy] = useState(false)
  const driveBusyRef = useRef(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [temaOpen, setTemaOpen] = useState(false)
  const [linguaOpen, setLinguaOpen] = useState(false)
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
        const account = await DriveAuth.leggi({ uid })
        if (driveLettura.current === id) {
          setDriveEmail(account.collegato ? account.email ?? frasi.bakDriveCollegato : null)
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
    const next = recipe(source)
    if (next === source) return true
    const ok = save(next)
    if (!ok) toast.show(frasi.authSalvataggio, 'plain')
    return ok
  }

  function segnaBackupImpostato(acceso: boolean) {
    update((current) => conBackupImpostato(current, acceso))
  }

  useEffect(() => {
    if (!ready || !driveEmail) return
    segnaBackupImpostato(true)
  }, [ready, driveEmail])

  // «Aggiungi» della home arriva qui con openBusiness: si apre il dialogo Toelettatura una volta.
  const statoNav = location.state as { openBusiness?: boolean; openBackup?: boolean; openLingua?: boolean } | null
  const openBusinessState = statoNav?.openBusiness === true
  const openBackupState = statoNav?.openBackup === true
  const openLinguaState = statoNav?.openLingua === true
  useEffect(() => {
    if (!openBusinessState || !ready) return
    navigate('/impostazioni/account?scheda=personali&modifica=toelettatura', { replace: true })
  }, [openBusinessState, ready, navigate])
  useEffect(() => {
    if (!openBackupState || !ready) return
    setBackupOpen(true)
    navigate('.', { replace: true, state: null })
  }, [openBackupState, ready, navigate])
  useEffect(() => {
    if (!openLinguaState || !ready) return
    setLinguaOpen(true)
    navigate('.', { replace: true, state: null })
  }, [openLinguaState, ready, navigate])

  async function copyVat() {
    try {
      await navigator.clipboard.writeText(settings.business.vatNumber)
      toast.show(frasi.prenotaCopiato, 'plain')
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
      toast.show(frasi.bakCopiaScaricata, 'plain')
    } catch {
      toast.show(frasi.authSalvataggio, 'plain')
    }
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
    if (!uid || driveBusyRef.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      toast.show(frasi.impConnessione, 'plain')
      return
    }
    driveBusyRef.current = true
    setDriveBusy(true)
    try {
      const account = await DriveAuth.collega({ uid })
      if (account.proposto && !account.collegato) {
        setDriveProposta(account.email ?? '')
        return
      }
      if (!account.collegato) {
        toast.show(frasi.bakCollegamentoKo, 'plain')
        return
      }
      driveLettura.current += 1
      setDriveProposta(null)
      setDriveEmail(account.email ?? frasi.bakDriveCollegato)
      toast.show(frasi.bakDriveCollegato, 'plain')
    } catch (error) {
      if (error instanceof Error && error.message === 'annullato') return
      if (error instanceof Error && error.message === 'telefono') {
        toast.show(frasi.bakSoloTelefono, 'plain')
        return
      }
      toast.show(frasi.bakCollegamentoKo, 'plain')
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
      setDriveProposta(null)
      segnaBackupImpostato(false)
      toast.show(frasi.bakScollegato, 'plain')
    } catch (error) {
      if (error instanceof Error && error.message === 'telefono') {
        toast.show(frasi.bakSoloTelefono, 'plain')
        return
      }
      toast.show(frasi.bakCollegamentoKo, 'plain')
    } finally {
      driveBusyRef.current = false
      setDriveBusy(false)
    }
  }

  async function confermaDrive() {
    if (!uid || driveBusyRef.current) return
    driveBusyRef.current = true
    setDriveBusy(true)
    try {
      const account = await DriveAuth.conferma({ uid })
      if (!account.collegato) {
        toast.show(frasi.bakCollegamentoKo, 'plain')
        return
      }
      driveLettura.current += 1
      setDriveProposta(null)
      setDriveEmail(account.email ?? frasi.bakDriveCollegato)
      toast.show(frasi.bakDriveCollegato, 'plain')
    } catch (error) {
      if (error instanceof Error && error.message === 'telefono') {
        toast.show(frasi.bakSoloTelefono, 'plain')
        return
      }
      toast.show(frasi.bakCollegamentoKo, 'plain')
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
  const driveStato = uid ? statoDrive({
    ultimo: localStorage.getItem(`groomly.users.${uid}.driveUltimoInvio`),
    errore: localStorage.getItem(chiaveErroreDrive(uid)) !== null,
    frequenza: settings.backup.frequenza,
    now: new Date(),
  }) : null
  const backupTone = driveStato?.tono ?? 'ok'
  const now = new Date()
  const badge = reportBadgeVisible(settings.ui.reportBadgeSince, now)
  const collaboratore = account?.role === 'collaboratore'
  const { lingua, scegli } = useLingua()
  const frasi = useFrasi()
  const headline = businessHeadline(settings.business, frasi.authIva)
  const backupGrezzo = backupStatusLabel(settings.backup.lastAt, now)
  const backupLabel = driveStato?.testo ?? (lingua === 'it' ? backupGrezzo : etichettaBackup(settings.backup.lastAt, now, lingua, frasi.impMai, frasi.impOggiCompletato))
  const opzioniLingua: { value: Lingua; label: string }[] = [
    { value: 'it', label: 'Italiano' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
  ]
  const passi = passiCompletamento({
    logo: Boolean(settings.priceSheet?.intestazione.logo),
    indirizzo: settings.business.address.trim().length > 0,
    orari: orariCompilati(settings.orari),
    listino: activeCount > 0,
    backup: backupImpostato(settings) || Boolean(driveEmail),
    email: session.emailVerified,
    fiscale: !fiscalNoticeVisible(settings.business.vatNumber, settings.business.taxCode),
  })
  const anello = avanzamentoSalone(passi)
  const telefoni = Object.fromEntries(dogs.map((dog) => [dog.id, dog.contact.phone ?? '']))
  const avvisiNuovi = codaDomani(appointments, telefoni, now, settings.avvisiInviati ?? {}).length
  const nomePiano = piano.livelloNome === 'vip'
    ? frasi.uteVip
    : piano.livelloNome === 'salone' || piano.stato.livello === 'salone'
      ? frasi.hubSalone
      : piano.livelloNome === 'pro' || piano.stato.livello === 'pro'
        ? frasi.hubLivelloPro
        : frasi.hubLivelloBase
  const iniziale = ((headline.title || email || 'G').trim().charAt(0) || 'G').toUpperCase()
  const hrefPiano = '/impostazioni/piano'
  function vaiPasso(id: PassoSalone) {
    if (id === 'logo') navigate('/listino/gestione')
    else if (id === 'sede') navigate('/impostazioni/account?scheda=personali&modifica=toelettatura')
    else if (id === 'listino') navigate('/listino')
    else if (id === 'backup') setBackupOpen(true)
    else if (id === 'fiscale') navigate('/impostazioni/account?scheda=personali&modifica=toelettatura')
    else navigate('/impostazioni/account?scheda=sicurezza')
  }
  const etichettaPasso: Record<PassoSalone, string> = {
    logo: frasi.hubPassoLogo,
    sede: frasi.hubPassoSede,
    listino: frasi.hubPassoListino,
    backup: frasi.hubPassoBackup,
    email: frasi.hubPassoEmail,
    fiscale: frasi.hubPassoFiscale,
  }
  return (
    <ShellFrame>
      <Header title={frasi.navImpostazioni} />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {isOperator(email) ? (
          <>
            <SectionTitle>{frasi.hubOperatori}</SectionTitle>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate('/impostazioni/account')}
              aria-label={frasi.hubGestisci}
              style={{ ...rowButton, alignItems: 'center' }}
            >
              {logoSrc ? (
                <img alt="" src={logoSrc} width={48} height={48} style={riquadroLogo(formaLogo(settings.priceSheet?.intestazione.logoForma), 48)} />
              ) : (
                <span aria-hidden style={{ width: 48, height: 48, borderRadius: 24, display: 'grid', placeItems: 'center', background: 'var(--surf)', fontWeight: 750 }}>{iniziale}</span>
              )}
              <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 22, lineHeight: 1.15, ...USER_TEXT }}>{empty || !ready ? (ready ? frasi.homeAggiungi : '…') : headline.title}</span>
            </button>
            {collaboratore ? null : <IconButton label={frasi.impModifica} onClick={() => navigate('/impostazioni/account?scheda=personali&modifica=toelettatura')}><Pencil size={16} strokeWidth={2} aria-hidden /></IconButton>}
          </div>
          {collaboratore ? null : (
            <Link to={hrefPiano} aria-label={`${frasi.hubPiano}, ${nomePiano}`} style={{ alignSelf: 'flex-start', minHeight: 44, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
              <Chip tone="pri">{`${frasi.hubPiano} · ${nomePiano}`}</Chip>
            </Link>
          )}
        </div>
        {!empty && headline.detail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <span style={{ color: 'var(--tx3)', fontSize: TYPE.meta, ...USER_TEXT }}>{headline.detail}</span>
            {settings.business.vatNumber.trim() ? (
              <button type="button" onClick={() => void copyVat()} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 700, padding: '10px 0', flex: 'none' }}>{frasi.impCopia}</button>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Link to="/impostazioni/suggerimenti" style={scorciatoia}>
            <Lightbulb size={16} strokeWidth={2} aria-hidden />
            <span>{frasi.hubSuggerimenti}</span>
          </Link>
          <Link to="/incassi/report" style={{ ...scorciatoia, position: 'relative' }}>
            <Wallet size={16} strokeWidth={2} aria-hidden />
            <span>{frasi.hubIncassi}</span>
            {badge ? <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--on-pri)', background: 'var(--pri-solid)', borderRadius: 999, padding: '1px 6px', width: 'max-content' }}>{frasi.impNuovo}</span> : null}
          </Link>
          <Link to="/impostazioni/notifiche" aria-label={avvisiNuovi > 0 ? frasi.hubAvvisiNuovi : frasi.hubAvvisi} style={{ ...scorciatoia, position: 'relative' }}>
            <Bell size={16} strokeWidth={2} aria-hidden />
            <span>{frasi.hubAvvisi}</span>
            {avvisiNuovi > 0 ? <span aria-hidden style={{ width: 8, height: 8, borderRadius: 8, background: 'var(--pri)', position: 'absolute', top: 8, right: 8 }} /> : null}
          </Link>
        </div>

        {collaboratore ? null : (
          <Card>
            <div style={{ display: 'flex', gap: 10, padding: 10, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{anello.completo ? frasi.hubCompletato : frasi.hubCompleta}</div>
                {anello.completo ? null : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {passi.filter((passo) => !passo.fatto).map((passo) => (
                      <button key={passo.id} type="button" onClick={() => vaiPasso(passo.id)} style={{ border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--pri)', borderRadius: 999, font: 'inherit', fontWeight: 650, fontSize: 12, padding: '0 12px', minHeight: 44 }}>
                        {etichettaPasso[passo.id]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Anello fatti={anello.fatti} tutti={anello.tutti} />
            </div>
          </Card>
        )}

        {MOSTRA_INVITO_COLLEGA ? (
          <Card>
            <SRow style={{ borderTop: 'none' }}>
              <MenuBody title={frasi.hubInvito} detail={frasi.hubInvitoDettaglio} />
            </SRow>
          </Card>
        ) : null}

        {collaboratore ? null : (
          <>
            <SectionTitle>{frasi.hubSalone}</SectionTitle>
            <Card>
              {voce === 'team' ? (
                <SRow style={{ borderTop: 'none' }}>
                  <Link to="/impostazioni/team" style={menuLink}>
                    <MenuIcon tone="prim"><Users size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                    <MenuBody title={frasi.hubCollaboratori} detail={frasi.impInvita} />
                    <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                  </Link>
                </SRow>
              ) : null}
              <SRow style={voce === 'team' ? undefined : { borderTop: 'none' }}>
                <Link to="/listino" style={menuLink}>
                  <MenuIcon tone="prim"><BookOpen size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={frasi.hubListino} />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
              <SRow>
                <Link to="/impostazioni/servizi" style={menuLink}>
                  <MenuIcon tone="prim"><Scissors size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={frasi.impServizi} detail={activeCount === 1 ? frasi.impServizioUno : frasi.impServiziN.replace('{{n}}', String(activeCount))} />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
              <SRow>
                <Link to="/impostazioni/archivio" style={menuLink}>
                  <MenuIcon tone="prim"><Archive size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                  <MenuBody title={frasi.impArchivio} detail={attesaCifre ? '…' : frasi.impArchivioN.replace('{{n}}', String(archived))} />
                  <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
                </Link>
              </SRow>
            </Card>
          </>
        )}

        <SectionTitle>{frasi.hubFunzioni}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/strumenti" aria-label={frasi.strumenti} style={menuLink}>
              <MenuIcon tone="prim"><Wrench size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.hubControlli} detail={frasi.strumentiDettaglio} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          {collaboratore ? null : (
            <SRow>
              <button
                type="button"
                aria-label={`Backup. ${backupLabel}. ${settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}${driveEmail ? `. ${driveEmail}` : ''}`}
                onClick={() => setBackupOpen(true)}
                style={rowButton}
              >
                <MenuIcon tone="ok"><Cloud size={13} strokeWidth={2} aria-hidden /></MenuIcon>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span>{frasi.hubBackup}</span>
                  <small style={{ color: 'var(--tx3)' }}>{settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}</small>
                  {driveEmail ? <span style={{ color: 'var(--tx2)', fontSize: TYPE.meta, ...USER_TEXT }}>{driveEmail}</span> : null}
                </span>
                <StatusPill tone={backupTone}>{backupLabel}</StatusPill>
                <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
              </button>
            </SRow>
          )}
          <input
            ref={restoreRef}
            aria-label={frasi.bakScegliBackup}
            type="file"
            accept="application/json,.json,application/zip,.zip"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void onRestoreFile(file)
            }}
          />
          {undo && !collaboratore ? (
            <SRow>
              <Button variant="secondary" onClick={() => { void annullaRipristino() }} disabled={restoring || undoing} style={{ flex: 1 }}>
                {frasi.bakAnnulla}
              </Button>
            </SRow>
          ) : null}
        </Card>

        <SectionTitle>{frasi.hubApp}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" aria-haspopup="dialog" aria-label={`${frasi.impTema}, ${theme === 'dark' ? frasi.impScuro : theme === 'auto' ? frasi.impAuto : frasi.impChiaro}`} onClick={() => setTemaOpen(true)} style={rowButton}>
              <MenuIcon tone="prim"><Palette size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <span style={{ flex: 1 }}>{frasi.impAspetto}</span>
              <span>{frasi.impTema}</span>
              <span style={{ color: 'var(--tx2)', fontWeight: 650 }}>{theme === 'dark' ? frasi.impScuro : theme === 'auto' ? frasi.impAuto : frasi.impChiaro}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
            <button type="button" aria-haspopup="dialog" onClick={() => setLinguaOpen(true)} style={rowButton}>
              <MenuIcon tone="prim"><Languages size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <span style={{ flex: 1 }}>{frasi.linguaTua}</span>
              <span style={{ color: 'var(--tx2)', fontWeight: 650 }}>{opzioniLingua.find((opzione) => opzione.value === lingua)?.label ?? 'Italiano'}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </button>
          </SRow>
          <SRow>
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

        <SectionTitle>{frasi.hubAccount}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/account" style={menuLink}>
              <MenuIcon tone="prim"><UserRound size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.hubGestisci} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <SectionTitle>{frasi.hubInfo}</SectionTitle>
        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <Link to="/impostazioni/legale" style={menuLink}>
              <MenuIcon tone="prim"><Scale size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.impLegale} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
          <SRow>
            <Link to="/impostazioni/info" style={menuLink}>
              <MenuIcon tone="prim"><Info size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              <MenuBody title={frasi.hubInfoApp} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          </SRow>
        </Card>

        <Card>
          <SRow style={{ borderTop: 'none' }}>
            <button type="button" onClick={() => setLogoutOpen(true)} style={{ ...rowButton, color: 'var(--bad)', fontWeight: 700 }}>
              <MenuIcon tone="bad"><LogOut size={13} strokeWidth={2} aria-hidden /></MenuIcon>
              {frasi.impEsci}
            </button>
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
      </div>

      <Dialog open={backupOpen} title={frasi.impBackupTitolo} onClose={() => setBackupOpen(false)}>
        <StatusPill tone={backupTone}>{backupLabel}</StatusPill>
        <GroupLabel>{frasi.bakCopia}</GroupLabel>
        <CopieCloudRiga mostraPiani={funzioneVisibile(piano.stato, piano.funzioni, 'copieCloud')} stato={piano.stato} bucket={null} onPaywall={() => piano.apriPaywall('copieCloud')} />
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1 }}>
            <span>{frasi.bakAutomatico}</span>
            <small style={{ display: 'block', color: 'var(--tx3)' }}>{settings.backup.autoDaily ? frasi.impAutoAcceso : frasi.impAutoSpento}</small>
          </span>
          <Toggle checked={settings.backup.autoDaily} label={frasi.impBackupAuto} onChange={onAuto} />
        </SRow>
        <SRow style={{ borderTop: 'none' }}>
          <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>{frasi.bakFrequenza}</span>
            <InfoButton
              nome={frasi.bakFrequenza}
              titolo={frasi.bakFrequenza}
              etichetta={frasi.bakFrequenzaInfo}
              testo={[frasi.bakFrequenzaGiorno, frasi.bakFrequenzaSettimana, frasi.bakFrequenzaMese, frasi.bakFrequenzaAperta].join('\n')}
            />
          </span>
          <Segmented label={frasi.bakFrequenzaAria} value={settings.backup.frequenza ?? 'giorno'} onChange={onFrequenza} options={[
            { value: 'giorno', label: frasi.agendaGiorno },
            { value: 'settimana', label: frasi.agendaSettimana },
            { value: 'mese', label: frasi.agendaMese },
          ]} />
        </SRow>
        <SRow>
          <span style={{ flex: 1 }}>{frasi.bakWifi}</span>
          <Toggle checked={settings.backup.soloWifi !== false} label={frasi.bakWifi} onChange={(acceso) => onVincolo('soloWifi', acceso)} />
        </SRow>
        <SRow>
          <span style={{ flex: 1 }}>{frasi.bakCarica}</span>
          <Toggle checked={settings.backup.soloCarica === true} label={frasi.bakCarica} onChange={(acceso) => onVincolo('soloCarica', acceso)} />
        </SRow>
        {driveEmail ? (
          <SRow style={{ borderTop: 'none' }}>
            <span style={{ flex: 1 }}>{frasi.bakDriveCollegato}</span>
            <Button variant="secondary" onClick={() => { void scollegaDrive() }} disabled={driveBusy} style={{ marginLeft: 'auto' }}>{frasi.accScollega}</Button>
          </SRow>
        ) : (
          <BackupAction label={frasi.bakDriveCollega} detail={frasi.bakDriveNon} tone="prim" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void collegaDrive() }} disabled={driveBusy} />
        )}
        {driveEmail ? (
          <BackupAction label={frasi.bakDriveInvia} detail={frasi.bakDriveInviaDettaglio} tone="prim" icon={<Upload size={13} strokeWidth={2} aria-hidden />} onClick={() => { void inviaDrive() }} disabled={driveBusy || invioBusy} busy={invioBusy} />
        ) : null}
        <GroupLabel>{frasi.bakTenere}</GroupLabel>
        <BackupAction label={frasi.bakRegistro} detail={frasi.bakRegistroDettaglio} tone="prim" icon={<FileSpreadsheet size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportRegistro() }} disabled={registroBusy} busy={registroBusy} />
        <BackupAction label={frasi.bakZip} detail={frasi.bakZipDettaglio} tone="prim" icon={<FileArchive size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportBackupZip() }} disabled={zipBusy} busy={zipBusy} />
        <BackupAction label={frasi.bakCompleto} detail={frasi.bakCompletoDettaglio} tone="prim" icon={<Image size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportBackupCompleto() }} disabled={completoBusy} busy={completoBusy} />
        <BackupAction label={frasi.bakVeloce} detail={frasi.bakVeloceDettaglio} tone="prim" icon={<Download size={13} strokeWidth={2} aria-hidden />} onClick={() => { void exportZip() }} />
        <GroupLabel>{frasi.bakStorto}</GroupLabel>
        <BackupAction label={frasi.bakRipristinaFile} detail={frasi.bakRipristinaFileDettaglio} tone="warn" icon={<Upload size={13} strokeWidth={2} aria-hidden />} onClick={() => restoreRef.current?.click()} />
        {driveEmail ? (
          <BackupAction label={frasi.bakDriveRipristina} detail={frasi.bakDriveRipristinaDettaglio} tone="warn" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void apriCopieDrive() }} disabled={copieBusy} busy={copieBusy} />
        ) : null}
      </Dialog>
      <Dialog open={temaOpen} title={frasi.impScegliTema} onClose={() => setTemaOpen(false)}>
        <SceltaLista
          label={frasi.impTema}
          value={theme}
          onChange={onTheme}
          options={[
            { value: 'light', label: frasi.impChiaro },
            { value: 'dark', label: frasi.impScuro },
            { value: 'auto', label: frasi.impAuto },
          ]}
        />
      </Dialog>
      <Dialog open={linguaOpen} title={frasi.linguaTua} onClose={() => setLinguaOpen(false)}>
        <p style={{ margin: 0, color: 'var(--tx2)', fontSize: TYPE.meta, lineHeight: 1.4 }}>{frasi.linguaMessaggiDettaglio}</p>
        <SceltaLista label={frasi.linguaDispositivo} value={lingua} onChange={scegli} options={opzioniLingua} />
      </Dialog>
      <Dialog open={copie !== null} title={frasi.bakDriveCopie} onClose={() => { if (!copieBusy) setCopie(null) }}>
        {copie?.map((copia) => {
          const etichetta = etichettaCopia(copia.giorno, copia.nome)
          return (
            <BackupAction key={copia.id} label={etichetta} detail={frasi.bakDriveCopiaDettaglio} tone="warn" icon={<Cloud size={13} strokeWidth={2} aria-hidden />} onClick={() => { void scegliCopiaDrive(copia) }} disabled={copieBusy} busy={copieBusy} />
          )
        })}
      </Dialog>
      <Dialog open={driveProposta !== null} title={frasi.bakDriveCollega} onClose={() => setDriveProposta(null)}>
        <p style={{ margin: 0 }}>{frasi.bakUsaAccount.replace('{{email}}', driveProposta ?? '')}</p>
        <Button onClick={() => { void confermaDrive() }} disabled={driveBusy}>{frasi.bakDriveCollega}</Button>
        <Button variant="secondary" onClick={() => setDriveProposta(null)}>{frasi.bakNonOra}</Button>
      </Dialog>
      <Dialog open={pending !== null} title={frasi.caniRipristina} onClose={() => { setParola(''); setPending(null) }}>
        <p style={{ margin: 0 }}>{counts ? `${counts.dogs} cani, ${counts.appointments} appuntamenti, ${counts.services} servizi` : ''}</p>
        <p style={{ margin: 0 }}>{frasi.bakSostituisce}</p>
        <p style={{ margin: 0 }}>{frasi.bakUnisciSpiega}</p>
        <Button onClick={() => { void confirmRestore('unisci') }} disabled={restoring}>{frasi.bakUnisci}</Button>
        <Input label={frasi.bakPerSostituire} value={parola} onChange={(event) => setParola(event.target.value)} />
        <Button variant="bad" onClick={() => { void confirmRestore('sostituisci') }} disabled={restoring || parola !== 'SOSTITUISCI'}>{frasi.bakRipristina}</Button>
        <Button variant="secondary" onClick={() => { setParola(''); setPending(null) }}>{frasi.homeAnnulla}</Button>
      </Dialog>
      <Dialog open={logoutOpen} title={frasi.impEsciDomanda} onClose={() => setLogoutOpen(false)}>
        <Button variant="secondary" onClick={() => setLogoutOpen(false)}>{frasi.appResta}</Button>
        <Button variant="bad" onClick={() => session.logout()}>{frasi.impEsci}</Button>
      </Dialog>
    </ShellFrame>
  )
}
