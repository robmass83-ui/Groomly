import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { callAcceptInvite, reloadSignedInAccount } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'

function callableMessage(error: unknown, lingua: Lingua): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    const split = message.indexOf(': ')
    if (split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split))) return message.slice(split + 2)
    return message
  }
  return t(lingua, 'invitoInvio')
}

export function InvitePage() {
  const params = useParams()
  const token = params.token ?? ''
  const navigate = useNavigate()
  const frasi = useFrasi()
  const { lingua } = useLingua()
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
        setError(callableMessage(caught, lingua))
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
  }, [signedIn, token, lingua])

  return (
    <PhoneShell>
      <Header title={frasi.invitoTitolo} />
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
            {frasi.authEntra}
          </Link>
        ) : null}
        {error ? <p style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.base }}>{error}</p> : null}
      </div>
    </PhoneShell>
  )
}
