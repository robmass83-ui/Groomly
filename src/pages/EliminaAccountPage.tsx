import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { firebaseEnabled } from '../data/firebase/enabled'
import { usePiano } from '../hooks/usePiano'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { useFrasi } from '../i18n/LinguaContext'
import { accountNonEliminabile } from '../lib/accountProtetto'
import { confermaEliminaValida } from '../lib/confermaElimina'
import { avvisoAbbonamentoPlay } from '../lib/avvisoPlay'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

const PLAY = 'https://play.google.com/store/account/subscriptions?package=it.groomly.app'

export function EliminaAccountPage() {
  const frasi = useFrasi()
  const toast = useToast()
  const navigate = useNavigate()
  const session = useSession()
  const piano = usePiano()
  const { settings } = useSettings()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const nome = settings.business.salonName.trim() || settings.business.name.trim()
  const protetto = accountNonEliminabile({
    email: account?.email,
    salonId: account?.salonId,
    uid: account?.uid,
    vip: piano.livelloNome === 'vip',
  })
  const play = avvisoAbbonamentoPlay(piano.fonte, piano.statoAbbonamento)
  const membro = account?.role === 'collaboratore' || (account?.role === 'socio' && account.salonId !== account.uid)
  const [passo, setPasso] = useState(0)
  const [password, setPassword] = useState('')
  const [frase, setFrase] = useState('')
  const [errore, setErrore] = useState('')
  const [occupato, setOccupato] = useState(false)
  const conferma = confermaEliminaValida(frase, nome)

  function avanti() {
    if (passo === 1 && !play) {
      setPasso(3)
      return
    }
    setPasso((n) => n + 1)
  }

  async function confermaPassword() {
    setOccupato(true)
    setErrore('')
    try {
      const mod = await import('../data/firebase/client')
      await mod.verificaPassword(password)
      setPasso(5)
    } catch {
      setErrore(frasi.authWrong)
    } finally {
      setOccupato(false)
    }
  }

  async function elimina() {
    if (!conferma) return
    if (!firebaseEnabled()) {
      toast.show(frasi.delOffline, 'plain')
      return
    }
    setOccupato(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.callEliminaAccount()
      toast.show(frasi.delFatto, 'plain')
      session.logout()
    } catch (error) {
      toast.show(error instanceof Error ? error.message : frasi.authSalvataggio, 'plain')
    } finally {
      setOccupato(false)
    }
  }

  return (
    <ShellFrame>
      <Header title={frasi.eliminaAccount} backTo="/impostazioni/account?scheda=privacy" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {protetto ? (
          <Card style={{ padding: 12 }}>
            <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.delBlocca}</p>
          </Card>
        ) : (
          <Card style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {passo === 0 ? (
              <>
                <h2 style={{ margin: 0, fontSize: 16 }}>{frasi.delCosa}</h2>
                <p style={{ margin: 0, color: 'var(--tx2)', lineHeight: 1.45 }}>{frasi.delElenco}</p>
                <Button onClick={avanti}>{frasi.delAvanti}</Button>
              </>
            ) : null}
            {passo === 1 ? (
              <>
                <h2 style={{ margin: 0, fontSize: 16 }}>{frasi.delPrima}</h2>
                <Button variant="secondary" onClick={() => navigate('/impostazioni', { state: { openBackup: true } })}>{frasi.delSalva}</Button>
                <Button onClick={avanti}>{frasi.delAvanti}</Button>
              </>
            ) : null}
            {passo === 2 ? (
              <>
                <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.delPlay}</p>
                <a href={PLAY} style={{ color: 'var(--pri)', fontWeight: 700 }}>{frasi.delPlayLink}</a>
                <Button onClick={avanti}>{frasi.delAvanti}</Button>
              </>
            ) : null}
            {passo === 3 ? (
              <>
                <p style={{ margin: 0, lineHeight: 1.45 }}>{membro ? frasi.delMembro : frasi.delTitolare}</p>
                <Button onClick={avanti}>{frasi.delAvanti}</Button>
              </>
            ) : null}
            {passo === 4 ? (
              <>
                <h2 style={{ margin: 0, fontSize: 16 }}>{frasi.delPassword}</h2>
                <Input label={frasi.accPasswordAttuale} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
                {errore ? <p role="alert" style={{ margin: 0, color: 'var(--bad)' }}>{errore}</p> : null}
                <Button onClick={() => { void confermaPassword() }} disabled={occupato || password.length === 0}>{frasi.delAvanti}</Button>
              </>
            ) : null}
            {passo === 5 ? (
              <>
                <h2 style={{ margin: 0, fontSize: 16 }}>{frasi.delScrivi}</h2>
                <Input label={frasi.delParola} value={frase} onChange={(event) => setFrase(event.target.value)} />
                <Button variant="bad" onClick={() => { void elimina() }} disabled={!conferma || occupato}>{frasi.confermaElimina}</Button>
              </>
            ) : null}
            <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.meta }}>info@groomlyapp.it</p>
          </Card>
        )}
      </div>
    </ShellFrame>
  )
}
