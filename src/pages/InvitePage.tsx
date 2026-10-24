import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { callAcceptInvite, reloadSignedInAccount } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'

function callableMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    const split = message.indexOf(': ')
    if (split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split))) return message.slice(split + 2)
    return message
  }
  return 'Invio non riuscito'
}

export function InvitePage() {
  const params = useParams()
  const token = params.token ?? ''
  const navigate = useNavigate()
  const session = useSession()
  const [error, setError] = useState('')
  const started = useRef(false)
  const replaceRef = useRef(session.replaceAccount)
  replaceRef.current = session.replaceAccount
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const signedIn = session.gate.kind === 'in'
  const signedOut = session.gate.kind === 'out' || session.gate.kind === 'corrupt'

  useEffect(() => {
    if (!signedIn || token === '') return
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        await callAcceptInvite(token)
      } catch (caught) {
        setError(callableMessage(caught))
        return
      }
      try {
        const account = await reloadSignedInAccount()
        if (account) replaceRef.current(account)
      } catch {
        // L'invito è già usato: un secondo errore spingerebbe a riprovare.
      }
      navigateRef.current('/')
    })()
  }, [signedIn, token])

  return (
    <PhoneShell>
      <Header title="Invito" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {signedOut ? (
          <Link
            to="/login"
            style={{
              display: 'grid',
              placeItems: 'center',
              minHeight: SIZES.button.hLg,
              borderRadius: SIZES.button.radiusLg,
              background: 'var(--pri-solid)',
              color: 'var(--on-pri)',
              fontWeight: 700,
              fontSize: TYPE.base,
              textDecoration: 'none',
            }}
          >
            Entra
          </Link>
        ) : null}
        {error ? <p style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.base }}>{error}</p> : null}
      </div>
    </PhoneShell>
  )
}
