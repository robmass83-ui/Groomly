import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { useSession } from '../../hooks/useSession'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { loginFailureMessage } from '../../lib/authAction'
import { passwordResetMessage } from '../../lib/authGate'

const TITOLO = 'Groomly Admin'
const CAMPO = { font: 'inherit', padding: 10, borderRadius: 10, border: '1.5px solid var(--line)', background: 'var(--card)', color: 'var(--tx)', outline: 'none', width: '100%', boxSizing: 'border-box' } as const
const ETICHETTA = { display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 600 } as const

/** Login del sito admin: solo chi ha già un account, qui non ci si registra. */
export function AdminLoginPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const session = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState('')
  const [avviso, setAvviso] = useState('')
  const [occupato, setOccupato] = useState(false)

  async function entra(evento: FormEvent) {
    evento.preventDefault()
    if (occupato) return
    setOccupato(true)
    setErrore('')
    setAvviso('')
    try {
      await session.login(email.trim().toLowerCase(), password)
    } catch (caught) {
      setErrore(loginFailureMessage((caught as { code?: string }).code, lingua))
    } finally {
      setOccupato(false)
    }
  }

  async function recupera() {
    setErrore('')
    if (!email.includes('@')) {
      setErrore(frasi.authEmailValida)
      return
    }
    await session.sendReset(email.trim().toLowerCase()).catch(() => undefined)
    setAvviso(passwordResetMessage())
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--bg)', color: 'var(--tx)' }}>
      <form onSubmit={(evento) => { void entra(evento) }} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>{TITOLO}</h1>
        <label style={ETICHETTA}>
          {frasi.authEmail}
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} style={CAMPO} />
        </label>
        <label style={ETICHETTA}>
          {frasi.authPassword}
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={CAMPO} />
        </label>
        {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
        {avviso ? <p style={{ margin: 0, color: 'var(--tx2)' }}>{avviso}</p> : null}
        <Button type="submit" disabled={occupato || email === '' || password === ''}>{frasi.authEntra}</Button>
        <button type="button" onClick={() => { void recupera() }} style={{ border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontWeight: 600, minHeight: 44 }}>{frasi.authDimenticata}</button>
      </form>
    </main>
  )
}
