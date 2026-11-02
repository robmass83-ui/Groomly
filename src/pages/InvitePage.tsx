import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { messaggioCallable } from '../components/team/messaggioCallable'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { callAcceptInvite, callLeggiInvito, callRifiutaInvito, reloadSignedInAccount, salonePersonale } from '../data/firebase/client'
import { dopoCambioSalone } from '../data/local/cambioSalone'
import { dimenticaInvito, erroreInvitoDefinitivo, ricordaInvito } from '../data/local/invitoInSospeso'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import type { Lingua } from '../i18n/lingua'
import { t } from '../i18n/t'
import type { SceltaSalonePersonale } from '../lib/pausaSalone'
import { MESSAGGIO_EMAIL_NON_CONFERMATA, roleLabel, type StatoInvito } from '../lib/salonAccess'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'

type Lettura = { stato: StatoInvito; salone: string; ruolo: 'socio' | 'collaboratore' | null }

function callableMessage(error: unknown, lingua: Lingua): string {
  const generico = t(lingua, 'invitoInvio')
  const message = messaggioCallable(error, generico, generico)
  return message === MESSAGGIO_EMAIL_NON_CONFERMATA ? t(lingua, 'invitoConfermaEmail') : message
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
  const [lettura, setLettura] = useState<Lettura | null>(null)
  const [letturaFallita, setLetturaFallita] = useState(false)
  const started = useRef(false)
  const inCorso = useRef(false)
  const replaceRef = useRef(session.replaceAccount)
  replaceRef.current = session.replaceAccount
  const linguaRef = useRef(lingua)
  linguaRef.current = lingua
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : null
  // Chi lavora già in un altro salone non può leggere il proprio: decide il server («ha già un salone»).
  const altroSalone = session.gate.kind === 'in'
    && Boolean(session.gate.account.salonId)
    && session.gate.account.salonId !== session.gate.account.uid
  const uidRef = useRef(uid)
  uidRef.current = uid
  const definitivo = error !== '' && erroreInvitoDefinitivo(error)
  const signedOut = session.gate.kind === 'out' || session.gate.kind === 'corrupt'
  const [controllo, setControllo] = useState(false)

  // Da fuori l'invito resta sul telefono: entrare o registrarsi riporta qui.
  useEffect(() => {
    if (signedOut && token !== '') ricordaInvito(token)
  }, [signedOut, token])

  // Da non confermato l'invito resta sul telefono: confermata l'email si riprende da qui.
  const daConfermare = !signedOut && lettura?.stato === 'aperto' && !session.emailVerified && !session.legacy
  useEffect(() => {
    if (daConfermare && token !== '') ricordaInvito(token)
  }, [daConfermare, token])

  // Chi ha confermato l'email in un'altra scheda rilegge lo stato qui: se non è ancora confermata, il testo resta.
  async function controllaConferma() {
    setControllo(true)
    try {
      await session.reloadVerification()
    } catch {
      // Ancora non confermata o rete assente: resta il testo, senza errori.
    } finally {
      setControllo(false)
    }
  }

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
    // Le copie sul telefono sono del salone di prima: si tolgono e l'app riparte sul nuovo salone.
    dopoCambioSalone(uidRef.current ?? '')
  }
  const accettaRef = useRef(accetta)
  accettaRef.current = accetta

  // Si legge l'invito una volta sola: accettare resta una scelta di chi apre la pagina.
  useEffect(() => {
    if (!uid || token === '') return
    if (started.current) return
    started.current = true
    void (async () => {
      try {
        const letto = await callLeggiInvito(token)
        if (letto.stato !== 'aperto') dimenticaInvito()
        setLettura(letto)
      } catch {
        setLetturaFallita(true)
        setError(t(linguaRef.current, 'invitoInvio'))
      }
    })()
  }, [uid, token])

  async function tocca() {
    if (inCorso.current) return
    inCorso.current = true
    try {
      if (altroSalone) {
        await accettaRef.current(undefined)
        return
      }
      let personale: { haDati: boolean; nome: string }
      try {
        personale = await salonePersonale(uid ?? '')
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
    } finally {
      inCorso.current = false
    }
  }

  async function rifiuta() {
    if (inCorso.current) return
    inCorso.current = true
    setInvio(true)
    try {
      await callRifiutaInvito(token)
    } catch (caught) {
      setError(callableMessage(caught, linguaRef.current))
      setInvio(false)
      inCorso.current = false
      return
    }
    dimenticaInvito()
    navigate('/')
  }

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
        {!signedOut && !avviso && !letturaFallita && lettura === null ? (
          <p style={{ margin: 0, fontSize: TYPE.base, color: 'var(--tx2)' }}>{frasi.invitoLettura}</p>
        ) : null}
        {!signedOut && !avviso && !definitivo && lettura?.stato === 'aperto' ? (
          !session.emailVerified && !session.legacy ? (
            <>
              <p style={{ margin: 0, fontSize: TYPE.base }}>{frasi.invitoConfermaEmail}</p>
              <Button type="button" size="lg" disabled={controllo} aria-busy={controllo || undefined} onClick={() => { void controllaConferma() }}>
                {frasi.invitoHoConfermato}
              </Button>
              <Button type="button" variant="secondary" size="lg" onClick={annulla}>{frasi.invitoVaiHome}</Button>
            </>
          ) : (
            <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
              <h2 style={{ margin: 0, fontSize: TYPE.base, fontWeight: 700 }}>
                {lettura.salone.trim()
                  ? t(lingua, 'invitoEntra', { nome: lettura.salone.trim(), ruolo: roleLabel(lettura.ruolo ?? 'collaboratore') })
                  : t(lingua, 'invitoEntraSenzaNome', { ruolo: roleLabel(lettura.ruolo ?? 'collaboratore') })}
              </h2>
              <Button type="button" disabled={invio} aria-busy={invio || undefined} onClick={() => { void tocca() }}>
                {frasi.invitoAccetta}
              </Button>
              <Button type="button" variant="secondary" disabled={invio} onClick={() => { void rifiuta() }}>
                {frasi.invitoRifiuta}
              </Button>
            </Card>
          )
        ) : null}
        {!signedOut && lettura && lettura.stato !== 'aperto' ? (
          <p style={{ margin: 0, fontSize: TYPE.base }}>
            {lettura.stato === 'gia-tuo'
              ? (lettura.salone.trim() ? t(lingua, 'invitoGiaTuo', { nome: lettura.salone.trim() }) : frasi.invitoGiaTuoSenzaNome)
              : lettura.stato === 'scaduto' ? frasi.invitoScaduto
              : lettura.stato === 'altra-email' ? frasi.invitoAltraEmail
              : frasi.invitoNonValido}
          </p>
        ) : null}
        {!signedOut && (letturaFallita || definitivo || (lettura && lettura.stato !== 'aperto')) ? (
          <Button type="button" variant="secondary" size="lg" onClick={annulla}>{frasi.invitoVaiHome}</Button>
        ) : null}
        {avviso ? (
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <h2 style={{ margin: 0, fontSize: TYPE.base, fontWeight: 700 }}>{frasi.invitoHaiSalone}</h2>
            <div style={{ fontSize: TYPE.base }}>{avviso.nome.trim() ? t(lingua, 'invitoHaiSaloneTesto', { nome: avviso.nome.trim() }) : frasi.invitoHaiSaloneTestoSenzaNome}</div>
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
