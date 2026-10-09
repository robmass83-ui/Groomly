import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { getAccount } from '../data/local/auth'
import { AppError } from '../data/errors'
import { loginSchema } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'

type FormValues = { email: string; password: string }

export function LoginPage() {
  const existing = getAccount()
  const session = useSession()
  const navigate = useNavigate()
  const creating = !existing
  const { register, handleSubmit, setError, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: existing ? { email: existing.email, password: '' } : undefined,
  })

  async function onSubmit(values: FormValues) {
    try {
      if (creating) await session.createAccount(values.email, values.password)
      else await session.login(values.email, values.password)
      navigate('/')
    } catch (error) {
      const message = error instanceof AppError && error.code === 'auth_crypto'
        ? 'Questo dispositivo non può proteggere la password'
        : error instanceof AppError && error.code === 'auth_offline'
          ? 'Connessione assente'
          : 'Email o password non corretti'
      setError('root', { message })
    }
  }

  return (
    <PhoneShell>
      <form onSubmit={handleSubmit(onSubmit)} style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <h1 style={{ margin: 0, fontSize: 17 }}>{creating ? 'Crea accesso' : 'Entra'}</h1>
        <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Input label="Email" type="email" autoComplete="username" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} {...register('password')} error={errors.password?.message} />
          {errors.root?.message ? <p style={{ margin: 0, color: 'var(--bad)' }}>{errors.root.message}</p> : null}
          <Button type="submit">{creating ? 'Crea accesso' : 'Entra'}</Button>
        </Card>
      </form>
    </PhoneShell>
  )
}
