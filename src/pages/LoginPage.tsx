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
import { loginFailureMessage } from '../lib/authAction'
import { confirmEmailCopy, passwordResetMessage } from '../lib/authGate'
import { loginSchema, registrationSchema } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import { TYPE } from '../theme/theme'
import { AuthMark } from '../components/brand/AuthMark'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
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
function mailFailureMessage(error: unknown): string {
  const code = errorCode(error)
  return code === 'auth_offline' ? loginFailureMessage(code) : loginFailureMessage('auth_slow')
}

function PasswordField({ registration, creating, error }: { registration: UseFormRegisterReturn; creating: boolean; error?: string }) {
  const [shown, setShown] = useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ flex: 1 }}>
        <Input
          label="Password"
          size="lg"
          autoComplete={creating ? 'new-password' : 'current-password'}
          icon={<Lock size={16} aria-hidden />}
          {...registration}
          type={shown ? 'text' : 'password'}
          error={error}
        />
      </div>
      <IconButton label={shown ? 'Nascondi password' : 'Mostra password'} onClick={() => setShown((open) => !open)}>
        {shown ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
      </IconButton>
    </div>
  )
}

function CreateView({ onEnter }: { onEnter: (email: string) => void }) {
  const session = useSession()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, clearErrors, getValues, formState: { errors, isSubmitting } } = useForm<CreateInput, unknown, CreateValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', salonName: '', vatNumber: '', address: '' },
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
      setError('root', { message: code === 'storage_write' ? 'Salvataggio non riuscito' : loginFailureMessage(code) })
    }
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>Crea account</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input label="Nome" size="lg" autoComplete="given-name" {...register('firstName')} error={errors.firstName?.message} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input label="Cognome" size="lg" autoComplete="family-name" {...register('lastName')} error={errors.lastName?.message} />
            </div>
          </div>
          <Input
            label="Email"
            size="lg"
            type="email"
            autoComplete="email"
            icon={<Mail size={16} aria-hidden />}
            {...register('email', { onChange: () => { setTaken(false); clearErrors('root') } })}
            error={errors.email?.message}
          />
          <PasswordField registration={register('password')} creating error={errors.password?.message} />
          <Input label="Nome della toelettatura" size="lg" {...register('salonName')} error={errors.salonName?.message} />
          <div style={{ fontSize: TYPE.section, fontWeight: 600, letterSpacing: TYPE.sectionTracking, color: 'var(--tx3)', textTransform: 'uppercase' }}>
            Puoi completarli dopo
          </div>
          <Input label="Partita IVA" size="lg" inputMode="numeric" {...register('vatNumber')} error={errors.vatNumber?.message} />
          <Input label="Indirizzo" size="lg" autoComplete="street-address" {...register('address')} error={errors.address?.message} />
          {errors.root?.message ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          {taken ? (
            <Button type="button" variant="secondary" onClick={() => onEnter(getValues('email').trim().toLowerCase())}>
              Entra con questa email
            </Button>
          ) : null}
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? 'Creazione…' : 'Crea account'}
          </Button>
        </Card>
      </form>
      <button type="button" style={linkStyle} onClick={() => onEnter(getValues('email').trim().toLowerCase())}>
        Hai già un account? Entra
      </button>
    </>
  )
}

function EnterView({ initialEmail, onCreate }: { initialEmail: string; onCreate: () => void }) {
  const session = useSession()
  const navigate = useNavigate()
  const { register, handleSubmit, setError, clearErrors, getValues, formState: { errors } } = useForm<EnterValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  })
  const [resetSent, setResetSent] = useState(false)

  async function onSubmit(values: EnterValues) {
    try {
      await session.login(values.email, values.password)
      navigate('/')
    } catch (error) {
      setError('root', { message: loginFailureMessage(errorCode(error)) })
    }
  }

  async function forgot() {
    clearErrors()
    if (!firebaseEnabled()) {
      setError('root', { message: loginFailureMessage('auth_offline') })
      return
    }
    const parsed = loginSchema.shape.email.safeParse(getValues('email'))
    if (!parsed.success) {
      setError('email', { message: parsed.error.issues[0]?.message ?? 'Inserisci un’email valida' })
      return
    }
    try {
      await session.sendReset(parsed.data.toLowerCase())
    } catch (error) {
      const code = errorCode(error)
      // Per ogni altro esito la risposta resta la stessa: non dice se l'indirizzo ha un account.
      if (code === 'auth_offline' || code === 'auth_slow') {
        setError('root', { message: loginFailureMessage(code) })
        return
      }
    }
    setResetSent(true)
  }

  if (resetSent) {
    return (
      <>
        <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>Entra</h1>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <p role="status" style={{ margin: 0, fontSize: TYPE.base }}>{passwordResetMessage()}</p>
          <Button type="button" onClick={() => setResetSent(false)}>Torna a Entra</Button>
        </Card>
      </>
    )
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>Entra</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Input
            label="Email"
            size="lg"
            type="email"
            autoComplete="username"
            icon={<Mail size={16} aria-hidden />}
            {...register('email')}
            error={errors.email?.message}
          />
          <PasswordField registration={register('password')} creating={false} error={errors.password?.message} />
          {errors.root?.message ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          <Button type="submit">Entra</Button>
        </Card>
      </form>
      <button type="button" style={linkStyle} onClick={() => { void forgot() }}>Password dimenticata</button>
      <button type="button" style={linkStyle} onClick={onCreate}>Non hai un account? Crea account</button>
    </>
  )
}

function ConfirmView({ email }: { email: string }) {
  const session = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState<'check' | 'resend' | null>(null)
  const [notice, setNotice] = useState<{ text: string; alert: boolean } | null>(null)

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
      else setNotice({ text: 'Il link non risulta ancora aperto', alert: false })
    } catch (error) {
      setNotice({ text: mailFailureMessage(error), alert: true })
    } finally {
      setPending(null)
    }
  }

  async function resend() {
    setPending('resend')
    setNotice(null)
    try {
      await session.resendVerification()
      setNotice({ text: 'Ti abbiamo scritto di nuovo.', alert: false })
    } catch (error) {
      setNotice({ text: mailFailureMessage(error), alert: true })
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <h1 style={{ margin: 0, fontSize: TYPE.pageTitle }}>Conferma l’email</h1>
      <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <p style={{ margin: 0, fontSize: TYPE.base }}>{confirmEmailCopy(email)}</p>
        {notice ? (
          <p role={notice.alert ? 'alert' : 'status'} style={{ margin: 0, color: notice.alert ? 'var(--bad)' : 'var(--tx2)' }}>{notice.text}</p>
        ) : null}
        <Button type="button" disabled={pending !== null} aria-busy={pending === 'check' || undefined} onClick={() => { void confirmed() }}>
          {pending === 'check' ? 'Controllo…' : 'Ho confermato'}
        </Button>
        <Button type="button" variant="secondary" disabled={pending !== null} aria-busy={pending === 'resend' || undefined} onClick={() => { void resend() }}>
          {pending === 'resend' ? 'Invio…' : 'Invia di nuovo'}
        </Button>
      </Card>
      <button type="button" style={linkStyle} onClick={() => session.logout()}>Esci</button>
    </>
  )
}

const repairSchema = registrationSchema.pick({ firstName: true, lastName: true, salonName: true })
type RepairInput = z.input<typeof repairSchema>
type RepairValues = z.output<typeof repairSchema>

function RepairView({ email }: { email: string }) {
  const session = useSession()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // Il profilo della registrazione resta sul telefono finché il salone non è scritto. Se manca (altro telefono,
  // dati cancellati) Riprova non ha da dove prendere i dati: si chiedono qui, solo i tre che servono.
  const [needsForm] = useState(() => readPendingSalon(email) === null)
  const { register, handleSubmit, formState: { errors } } = useForm<RepairInput, unknown, RepairValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: { firstName: '', lastName: '', salonName: '' },
  })

  async function retry(profile?: RepairValues) {
    setBusy(true)
    setNotice(null)
    try {
      await session.repair(profile)
    } catch (error) {
      const code = errorCode(error)
      if (code === 'auth_offline' || code === 'auth_slow') setNotice(loginFailureMessage(code))
    } finally {
      setBusy(false)
    }
  }

  const message = (
    <>
      <p style={{ margin: 0, fontSize: TYPE.base }}>Salvataggio non riuscito</p>
      <p style={{ margin: 0, fontSize: TYPE.base, color: 'var(--tx2)' }}>Il salone non è stato salvato. Riprova lo riscrive.</p>
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
                <Input label="Nome" size="lg" autoComplete="given-name" {...register('firstName')} error={errors.firstName?.message} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Input label="Cognome" size="lg" autoComplete="family-name" {...register('lastName')} error={errors.lastName?.message} />
              </div>
            </div>
            <Input label="Nome della toelettatura" size="lg" {...register('salonName')} error={errors.salonName?.message} />
            <Button type="submit" disabled={busy} aria-busy={busy || undefined}>{busy ? 'Salvataggio…' : 'Riprova'}</Button>
          </Card>
        </form>
      ) : (
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          {message}
          <Button type="button" disabled={busy} aria-busy={busy || undefined} onClick={() => { void retry() }}>{busy ? 'Salvataggio…' : 'Riprova'}</Button>
        </Card>
      )}
      <button type="button" style={linkStyle} onClick={() => session.logout()}>Esci</button>
    </>
  )
}

export function LoginPage() {
  const session = useSession()
  const [start] = useState(() => {
    const account = getAccount()
    const hint = readSignInHint()
    return { mode: (account || hint ? 'enter' : 'create') as Mode, email: account?.email ?? hint?.email ?? '' }
  })
  const [mode, setMode] = useState<Mode>(start.mode)
  const [email, setEmail] = useState(start.email)
  const entry = session.gate.kind === 'in' ? session.entry.kind : 'home'

  return (
    <PhoneShell>
      <AuthMark />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {entry === 'confirm-email' && session.gate.kind === 'in' ? (
          <ConfirmView email={session.gate.account.email} />
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
