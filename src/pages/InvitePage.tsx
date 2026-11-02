import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { callAcceptInvite, reloadSignedInAccount, salonePersonale } from '../data/firebase/client'
import { dimenticaInvito, erroreInvitoDefinitivo, ricordaInvito } from '../data/local/invitoInSospeso'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import type { SceltaSalonePersonale } from '../lib/pausaSalone'
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
  const [avviso, setAvviso] = useState<{ nome: string } | null>(null)
  const [invio, setInvio] = useState(false)
  const started = useRef(false)
  const replaceRef = useRef(session.replaceAccount)
  replaceRef.current = session.replaceAccount
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const linguaRef = useRef(lingua)
  linguaRef.current = lingua
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  const signedOut = session.gate.kind === 'out' || session.gate.kind === 'corrupt'

  // Da fuori l'invito resta sul telefono: entrare o registrarsi riporta qui.
  useEffect(() => {
    if (signedOut && token !== '') ricordaInvito(token)
  }, [signedOut, token])

  async function accetta(scelta?: SceltaSalonePersonale) {
    setInvio(true)
    try {
      await callAcceptInvite(token, scelta)
    } catch (caught) {
      const message = callableMessage(caught, linguaRef.current)
      if (erroreInvitoDefinitivo(message)) dimenticaInvito()
      setAvviso(null)
      setError(message)
      setInvio(false)
      return
    }
    dimenticaInvito()
    try {
      const account = await reloadSignedInAccount()
      if (account) replaceRef.current(account)
    } catch {
      // L'invito è già usato: un secondo errore spingerebbe a riprovare.
    }
    navigateRef.current('/')
  }
  const accettaRef = useRef(accetta)
  accettaRef.current = accetta

  useEffect(() => {
    if (!uid || token === '') return
    if (started.current) return
    started.current = true
    void (async () => {
      let personale: { haDati: boolean; nome: string }
      try {
        personale = await salonePersonale(uid)
      } catch {
        // Senza sapere se c'è un salone da mettere in pausa non si accetta: si sceglierebbe al posto suo.
        setError(t(linguaRef.current, 'invitoInvio'))
        return
      }
      if (personale.haDati) {
        setAvviso({ nome: personale.nome })
        return
      }
      await accettaRef.current(undefined)
    })()
  }, [uid, token])

  function annulla() {
    dimenticaInvito()
    navigate('/')
  }

  return (
    <PhoneShell>
      <Header title={frasi.invitoTitolo} />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {signedOut ? (
          <>
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
            <Button type="button" variant="secondary" size="lg" onClick={() => navigate('/login', { state: { mode: 'create' } })}>
              {frasi.authCrea}
            </Button>
          </>
        ) : null}
        {avviso ? (
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <h2 style={{ margin: 0, fontSize: TYPE.base, fontWeight: 700 }}>{frasi.invitoHaiSalone}</h2>
            <div style={{ fontSize: TYPE.base }}>{t(lingua, 'invitoHaiSaloneTesto', { nome: avviso.nome })}</div>
            <Button type="button" disabled={invio} aria-busy={invio || undefined} onClick={() => { void accetta('pausa') }}>
              {frasi.invitoPausa}
            </Button>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx2)' }}>{frasi.invitoPausaDettaglio}</div>
            <Button type="button" variant="secondary" disabled={invio} onClick={() => { void accetta('aperto') }}>
              {frasi.invitoAperto}
            </Button>
            <Button type="button" variant="ghost" disabled={invio} onClick={annulla}>
              {frasi.invitoAnnulla}
            </Button>
            <div style={{ fontSize: TYPE.meta, color: 'var(--tx3)' }}>{frasi.invitoAbbonamento}</div>
          </Card>
        ) : null}
        {error ? <p style={{ margin: 0, color: 'var(--bad)', fontSize: TYPE.base }}>{error}</p> : null}
      </div>
    </PhoneShell>
  )
}
