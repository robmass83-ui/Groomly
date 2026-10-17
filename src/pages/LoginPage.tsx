import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { AppError } from '../data/errors'
import { getAccount } from '../data/local/auth'
import { readSignInHint } from '../data/local/signInHint'
import { loginFailureMessage } from '../lib/authAction'
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
  const { register, handleSubmit, setError, clearErrors, getValues, formState: { errors } } = useForm<CreateInput, unknown, CreateValues>({
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
      setError('root', { message: loginFailureMessage(code) })
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
          <Button type="submit">Crea account</Button>
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
  const { register, handleSubmit, setError, formState: { errors } } = useForm<EnterValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: initialEmail, password: '' },
  })

  async function onSubmit(values: EnterValues) {
    try {
      await session.login(values.email, values.password)
      navigate('/')
    } catch (error) {
      setError('root', { message: loginFailureMessage(errorCode(error)) })
    }
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
      <button type="button" style={linkStyle}>Password dimenticata</button>
      <button type="button" style={linkStyle} onClick={onCreate}>Non hai un account? Crea account</button>
    </>
  )
}

export function LoginPage() {
  const [start] = useState(() => {
    const account = getAccount()
    const hint = readSignInHint()
    return { mode: (account || hint ? 'enter' : 'create') as Mode, email: account?.email ?? hint?.email ?? '' }
  })
  const [mode, setMode] = useState<Mode>(start.mode)
  const [email, setEmail] = useState(start.email)

  return (
    <PhoneShell>
      <AuthMark />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        {mode === 'create' ? (
          <CreateView onEnter={(typed) => { setEmail(typed || email); setMode('enter') }} />
        ) : (
          <EnterView key={email} initialEmail={email} onCreate={() => setMode('create')} />
        )}
      </div>
    </PhoneShell>
  )
}
