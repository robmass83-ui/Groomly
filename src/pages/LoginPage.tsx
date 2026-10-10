import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import logoScuro from '../assets/brand/groomly-logo-scuro.svg'
import logoVerticale from '../assets/brand/groomly-logo-verticale.svg'
import { firebaseEnabled } from '../data/firebase/enabled'
import { getAccount } from '../data/local/auth'
import { AppError } from '../data/errors'
import { loginFailureMessage, primaryAuthAction, shouldFallbackToSignIn } from '../lib/authAction'
import { loginSchema } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { prefersDark, resolveTheme } from '../theme/theme'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'

type FormValues = { email: string; password: string }

function authCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return ''
  const code = error.code
  return typeof code === 'string' ? code : ''
}

export function LoginPage() {
  const existing = getAccount()
  const session = useSession()
  const navigate = useNavigate()
  const creating = primaryAuthAction(firebaseEnabled(), existing != null) === 'create'
  const { theme } = useSettings()
  const dark = resolveTheme(theme, prefersDark()) === 'dark'
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: existing ? { email: existing.email, password: '' } : undefined,
  })

  async function onSubmit(values: FormValues) {
    try {
      if (creating) {
        try {
          await session.createAccount(values.email, values.password)
        } catch (error) {
          const code = error instanceof AppError ? error.code : authCode(error)
          if (!shouldFallbackToSignIn(code)) throw error
          await session.login(values.email, values.password)
        }
      } else {
        await session.login(values.email, values.password)
      }
      navigate('/')
    } catch (error) {
      const code = error instanceof AppError ? error.code : undefined
      setError('root', { message: loginFailureMessage(code) })
    }
  }

  return (
    <PhoneShell>
      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: '50%',
            overflow: 'hidden',
            boxShadow: '0 0 0 5px var(--card), 0 12px 30px -10px rgba(40,110,160,.6)',
            margin: '0 auto',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <img
            alt="Groomly"
            src={dark ? logoScuro : logoVerticale}
            width={dark ? 220 : 168}
            style={{ display: 'block', height: 'auto' }}
          />
        </div>
        <h1 style={{ margin: 0, fontSize: 17 }}>{creating ? 'Crea accesso' : 'Entra'}</h1>
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
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Password"
                size="lg"
                autoComplete={creating ? 'new-password' : 'current-password'}
                icon={<Lock size={16} aria-hidden />}
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                error={errors.password?.message}
              />
            </div>
            <IconButton
              label={showPassword ? 'Nascondi password' : 'Mostra password'}
              onClick={() => setShowPassword((open) => !open)}
            >
              {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </IconButton>
          </div>
          {errors.root?.message ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          <Button type="submit">{creating ? 'Crea accesso' : 'Entra'}</Button>
        </Card>
      </form>
    </PhoneShell>
  )
}
