import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { AppError } from '../data/errors'
import { firebaseEnabled } from '../data/firebase/enabled'
import { getAccount } from '../data/local/auth'
import { readPendingSalon } from '../data/local/pendingSalon'
import { readSignInHint } from '../data/local/signInHint'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { loginFailureMessage } from '../lib/authAction'
import { RESEND_WAIT_SECONDS, confirmEmailCopy, passwordResetMessage, resendWaitCopy } from '../lib/authGate'
import { loginSchemaPer, registrationSchema, registrationSchemaPer } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { AuthMark } from '../components/brand/AuthMark'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { AttesaZampe } from '../components/ui/Zampette'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'

type Mode = 'create' | 'enter'
type CreateInput = z.input<typeof registrationSchema>
type CreateValues = z.output<typeof registrationSchema>
type EnterValues = { email: string; password: string }

const linkStyle: CSSProperties = {
  alignSelf: 'center',
  minHeight: 44,
  padding: '0 12px',
  background: 'transparent',
  border: 'none',
  color: 'var(--pri-ink)',
  font: 'inherit',
  fontSize: TYPE.base,
  fontWeight: 600,
  cursor: 'pointer',
}

function errorCode(error: unknown): string | undefined {
  return error instanceof AppError ? error.code : undefined
}

// Connessione assente e attesa hanno il loro testo. Ogni altro errore di rete o di posta si ritenta più tardi.
function mailFailureMessage(error: unknown, lingua: 'it' | 'en' | 'es'): string {
  const code = errorCode(error)
  return code === 'auth_offline' ? loginFailureMessage(code, lingua) : loginFailureMessage('auth_slow', lingua)
}

function PasswordField({ registration, creating, error }: { registration: UseFormRegisterReturn; creating: boolean; error?: string }) {
  const frasi = useFrasi()
  const [shown, setShown] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Input
          label={frasi.authPassword}
          size="lg"
          autoComplete={creating ? 'new-password' : 'current-password'}
          icon={<Lock size={16} aria-hidden />}
          {...registration}
          type={shown ? 'text' : 'password'}
          error={error}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
        <span aria-hidden style={{ fontSize: SIZES.field.label, fontWeight: 600, visibility: 'hidden' }}>{frasi.authPassword}</span>
        <div style={{ display: 'flex', alignItems: 'center', height: SIZES.field.hLg }}>
          <IconButton label={shown ? frasi.authNascondi : frasi.authMostra} onClick={() => setShown((open) => !open)}>
            {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}

function CreateView({ onEnter }: { onEnter: (email: string) => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, clearErrors, getValues, formState: { errors, isSubmitting } } = useForm<CreateInput, unknown, CreateValues>({
    resolver: zodResolver(registrationSchemaPer(lingua)),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', salonName: '', vatNumber: '', address: '', accettaTermini: false },
  })
  const [taken, setTaken] = useState(false)

  async function onSubmit(values: CreateValues) {
    setTaken(false)
    try {
      await session.createAccount(values)
      navigate('/')
    } catch (error) {
      const code = errorCode(error)
      setTaken(code === 'auth_email_taken')
      setError('root', { message: code === 'storage_write' ? frasi.authSalvataggio : loginFailureMessage(code, lingua) })
    }
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>{frasi.authCrea}</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input label={frasi.authNome} size="lg" autoComplete="given-name" {...register('firstName')} error={errors.firstName?.message} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input label={frasi.authCognome} size="lg" autoComplete="family-name" {...register('lastName')} error={errors.lastName?.message} />
            </div>
          </div>
          <Input
            label={frasi.authEmail}
            size="lg"
            type="email"
            autoComplete="email"
            icon={<Mail size={16} aria-hidden />}
            {...register('email', { onChange: () => { setTaken(false); clearErrors('root') } })}
            error={errors.email?.message}
          />
          <PasswordField registration={register('password')} creating error={errors.password?.message} />
          <Input label={frasi.authToelettatura} size="lg" {...register('salonName')} error={errors.salonName?.message} />
          <div style={{ fontSize: TYPE.section, fontWeight: 600, letterSpacing: TYPE.sectionTracking, color: 'var(--tx3)', textTransform: 'uppercase' }}>
            {frasi.authDopo}
          </div>
          <Input label={frasi.authIva} size="lg" inputMode="numeric" {...register('vatNumber')} error={errors.vatNumber?.message} />
          {errors.root?.message ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          {taken ? (
            <Button type="button" variant="secondary" onClick={() => onEnter(getValues('email').trim().toLowerCase())}>
              {frasi.authEntraEmail}
            </Button>
          ) : null}
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
            <input type="checkbox" {...register('accettaTermini')} />
            <span>{frasi.accettaTermini}</span>
          </label>
          {errors.accettaTermini?.message ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errors.accettaTermini.message}</p> : null}
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? frasi.authCreazione : frasi.authCrea}
          </Button>
          <AttesaZampe testo={isSubmitting ? frasi.zampeAccount : null} />
        </Card>
      </form>
      <button type="button" style={linkStyle} onClick={() => onEnter(getValues('email').trim().toLowerCase())}>
        {frasi.authHaiAccount}
      </button>
    </>
  )
}

function EnterView({ initialEmail, onCreate }: { initialEmail: string; onCreate: () => void }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const navigate = useNavigate()
  const schema = loginSchemaPer(lingua)
  const { register, handleSubmit, setError, clearErrors, getValues, formState: { errors, isSubmitting } } = useForm<EnterValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: initialEmail, password: '' },
  })
  const [resetSent, setResetSent] = useState(false)

  async function onSubmit(values: EnterValues) {
    try {
      await session.login(values.email, values.password)
      navigate('/')
    } catch (error) {
      setError('root', { message: loginFailureMessage(errorCode(error), lingua) })
    }
  }

  async function forgot() {
    clearErrors()
    if (!firebaseEnabled()) {
      setError('root', { message: loginFailureMessage('auth_offline', lingua) })
      return
    }
    const parsed = schema.shape.email.safeParse(getValues('email'))
    if (!parsed.success) {
      setError('email', { message: parsed.error.issues[0]?.message ?? frasi.authEmailValida })
      return
    }
    try {
      await session.sendReset(parsed.data.toLowerCase())
    } catch (error) {
      const code = errorCode(error)
      // Per ogni altro esito la risposta resta la stessa: non dice se l'indirizzo ha un account.
      if (code === 'auth_offline' || code === 'auth_slow') {
        setError('root', { message: loginFailureMessage(code, lingua) })
        return
      }
    }
    setResetSent(true)
  }

  if (resetSent) {
    return (
      <>
        <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>{frasi.authEntra}</h1>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <p role="status" style={{ margin: 0, fontSize: TYPE.base }}>{passwordResetMessage(lingua)}</p>
          <Button type="button" onClick={() => setResetSent(false)}>{frasi.authTorna}</Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>{frasi.authEntra}</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Input
            label={frasi.authEmail}
            size="lg"
            type="email"
            autoComplete="username"
            icon={<Mail size={16} aria-hidden />}
            {...register('email')}
            error={errors.email?.message}
          />
          <PasswordField registration={register('password')} creating={false} error={errors.password?.message} />
          {errors.root?.message ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? frasi.authAccesso : frasi.authEntra}
          </Button>
          <AttesaZampe testo={isSubmitting ? frasi.authAccesso : null} />
        </Card>
      </form>
      <button type="button" style={linkStyle} onClick={() => { void forgot() }}>{frasi.authDimenticata}</button>
      <button type="button" style={linkStyle} onClick={onCreate}>{frasi.authNonHai}</button>
    </>
  )
}

function ConfirmView() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState<'check' | 'resend' | null>(null)
  const [notice, setNotice] = useState<{ text: string; alert: boolean } | null>(null)
  const [wait, setWait] = useState(RESEND_WAIT_SECONDS)
  const waiting = wait > 0

  useEffect(() => {
    if (!waiting) return
    const id = window.setInterval(() => {
      setWait((left) => (left <= 1 ? 0 : left - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [waiting])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return
      void session.reloadVerification().then((confirmed) => {
        if (confirmed) navigate('/')
      }).catch(() => undefined)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [session, navigate])

  async function confirmed() {
    setPending('check')
    setNotice(null)
    try {
      if (await session.reloadVerification()) navigate('/')
      else setNotice({ text: frasi.authLink, alert: false })
    } catch (error) {
      setNotice({ text: mailFailureMessage(error, lingua), alert: true })
    } finally {
      setPending(null)
    }
  }

  async function resend() {
    setPending('resend')
    setNotice(null)
    try {
      const sent = await session.resendVerification()
      if (sent?.alreadyVerified) {
        if (await session.reloadVerification()) navigate('/')
        return
      }
      setWait(RESEND_WAIT_SECONDS)
      setNotice({ text: frasi.authDiNuovo, alert: false })
    } catch (error) {
      setNotice({ text: mailFailureMessage(error, lingua), alert: true })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>{frasi.authConferma}</h1>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <p style={{ margin: 0, fontSize: TYPE.base }}>{confirmEmailCopy(lingua)}</p>
        {notice ? (
          <p role={notice.alert ? 'alert' : 'status'} style={{ margin: 0, color: notice.alert ? 'var(--bad)' : 'var(--tx2)' }}>{notice.text}</p>
        ) : null}
        {wait > 0 ? <p role="status" style={{ margin: 0, color: 'var(--tx2)' }}>{resendWaitCopy(wait, lingua)}</p> : null}
        <Button type="button" disabled={pending !== null} aria-busy={pending === 'check' || undefined} onClick={() => { void confirmed() }}>
          {pending === 'check' ? frasi.authControllo : frasi.authHoConfermato}
        </Button>
        <Button type="button" variant="secondary" disabled={pending !== null || wait > 0} aria-busy={pending === 'resend' || undefined} onClick={() => { void resend() }}>
          {pending === 'resend' ? frasi.authInvio : frasi.authInviaDiNuovo}
        </Button>
        <AttesaZampe testo={pending === 'check' ? frasi.authControllo : pending === 'resend' ? frasi.authInvio : null} />
      </Card>
      <button type="button" style={linkStyle} onClick={() => session.logout()}>{frasi.authEsci}</button>
    </>
  )
}

const repairSchema = registrationSchema.pick({ firstName: true, lastName: true, salonName: true })
type RepairInput = z.input<typeof repairSchema>
type RepairValues = z.output<typeof repairSchema>

function RepairView({ email }: { email: string }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // Il profilo della registrazione resta sul telefono finché il salone non è scritto. Se manca (altro telefono,
  // dati cancellati) Riprova non ha da dove prendere i dati: si chiedono qui, solo i tre che servono.
  const [needsForm] = useState(() => readPendingSalon(email) === null)
  const { register, handleSubmit, formState: { errors } } = useForm<RepairInput, unknown, RepairValues>({
    resolver: zodResolver(registrationSchemaPer(lingua).pick({ firstName: true, lastName: true, salonName: true })),
    defaultValues: { firstName: '', lastName: '', salonName: '' },
  })

  async function retry(profile?: RepairValues) {
    setBusy(true)
    setNotice(null)
    try {
      await session.repair(profile)
    } catch (error) {
      const code = errorCode(error)
      if (code === 'auth_offline' || code === 'auth_slow') setNotice(loginFailureMessage(code, lingua))
    } finally {
      setBusy(false)
    }
  }

  const message = (
    <>
      <p style={{ margin: 0, fontSize: TYPE.base }}>{frasi.authSalvataggio}</p>
      <p style={{ margin: 0, fontSize: TYPE.base, color: 'var(--tx2)' }}>{frasi.authNonSalvato}</p>
      {notice ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{notice}</p> : null}
    </>
  )

  return (
    <>
      {needsForm ? (
        <form onSubmit={handleSubmit((values) => retry(values))} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {message}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label={frasi.authNome} size="lg" autoComplete="given-name" {...register('firstName')} error={errors.firstName?.message} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label={frasi.authCognome} size="lg" autoComplete="family-name" {...register('lastName')} error={errors.lastName?.message} />
              </div>
            </div>
            <Input label={frasi.authToelettatura} size="lg" {...register('salonName')} error={errors.salonName?.message} />
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>{busy ? frasi.authSalvataggioPunti : frasi.authRiprova}</Button>
            <AttesaZampe testo={busy ? frasi.authSalvataggioPunti : null} />
          </Card>
        </form>
      ) : (
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {message}
          <Button type="button" disabled={busy} aria-busy={busy || undefined} onClick={() => { void retry() }}>{busy ? frasi.authSalvataggioPunti : frasi.authRiprova}</Button>
          <AttesaZampe testo={busy ? frasi.authSalvataggioPunti : null} />
        </Card>
      )}
      <button type="button" style={linkStyle} onClick={() => session.logout()}>{frasi.authEsci}</button>
    </>
  )
}

export function LoginPage() {
  const session = useSession()
  const [start] = useState(() => {
    const account = getAccount()
    const hint = readSignInHint()
    return { email: account?.email ?? hint?.email ?? '' }
  })
  const [mode, setMode] = useState<Mode>('enter')
  const [email, setEmail] = useState(start.email)
  const entry = session.gate.kind === 'in' ? session.entry.kind : 'home'

  return (
    <PhoneShell>
      <AuthMark />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {entry === 'confirm-email' && session.gate.kind === 'in' ? (
          <ConfirmView />
        ) : entry === 'repair-salon' ? (
          <RepairView email={session.gate.kind === 'in' ? session.gate.account.email : ''} />
        ) : mode === 'create' ? (
          <CreateView onEnter={(typed) => { setEmail(typed || email); setMode('enter') }} />
        ) : (
          <EnterView key={email} initialEmail={email} onCreate={() => setMode('create')} />
        )}
      </div>
    </PhoneShell>
  )
}
