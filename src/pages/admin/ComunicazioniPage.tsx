import { useEffect, useState } from 'react'
import { useAdminDati } from '../../components/admin/AdminDati'
import { AnnuncioPagamenti } from '../../components/admin/AnnuncioPagamenti'
import { AIUTO } from '../../components/admin/comuni'
import { ModuloComunicazione } from '../../components/admin/ModuloComunicazione'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Dialog } from '../../components/layout/Dialog'
import { useToast } from '../../components/layout/Toast'
import { Button } from '../../components/ui/Button'
import { Card, Row } from '../../components/ui/Card'
import { SectionTitle } from '../../components/ui/SectionTitle'
import {
  callEliminaComunicazione,
  callRiprendiComunicazione,
  elencoComunicazioni,
  type VoceComunicazione,
} from '../../data/firebase/adminClient'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { USER_TEXT } from '../../theme/text'
import { CORPO } from './comune'

export function ComunicazioniPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const { config } = useAdminDati()
  const [storico, setStorico] = useState<VoceComunicazione[]>([])
  const [daEliminare, setDaEliminare] = useState<VoceComunicazione | null>(null)
  const [occupata, setOccupata] = useState<string | null>(null)

  const carica = () => { void elencoComunicazioni().then(setStorico).catch(() => undefined) }
  useEffect(carica, [])

  async function agisci(id: string, azione: () => Promise<unknown>) {
    if (occupata) return
    setOccupata(id)
    try {
      await azione()
      carica()
    } catch (caught) {
      toast.show(caught instanceof Error && caught.message !== '' ? caught.message : frasi.amAzioneKo, 'plain')
    } finally {
      setOccupata(null)
    }
  }

  function dettagli(voce: VoceComunicazione): string {
    const a = voce.saloni === 'tutti' ? frasi.consATutti : frasi.consSaloniScelti.replace('{{n}}', String(voce.saloni))
    return [dataCorta(lingua, new Date(voce.quando)), a, voce.eliminata ? frasi.consEliminata : ''].filter((p) => p !== '').join(' · ')
  }

  return (
    <>
      <TestataAdmin titolo={frasi.consComunicazioni} />
      <div style={{ ...CORPO, maxWidth: 720 }}>
        <ModuloComunicazione onInviata={carica} />
        {config ? <AnnuncioPagamenti annuncioIl={config.piani.annuncioPagamentiIl} /> : null}
        {storico.length > 0 ? (
          <>
            <SectionTitle color="var(--tx3)">{frasi.consStorico}</SectionTitle>
            <Card>
              {storico.map((voce, indice) => (
                <Row key={voce.id} style={indice === 0 ? { borderTop: 'none' } : undefined}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, ...USER_TEXT }}>{voce.titolo}</div>
                    <div style={AIUTO}>{dettagli(voce)}</div>
                    {voce.email > 0 ? <div style={AIUTO}>{frasi.consInviateSu.replace('{{n}}', String(voce.inviate)).replace('{{tot}}', String(voce.email))}</div> : null}
                  </div>
                  {voce.email > voce.inviate && !voce.eliminata && !voce.inCorso ? (
                    <Button variant="secondary" size="sm" disabled={occupata !== null} onClick={() => { void agisci(voce.id, () => callRiprendiComunicazione(voce.id)) }}>{frasi.consRiprendi}</Button>
                  ) : null}
                  {voce.eliminata ? null : <Button variant="secondary" size="sm" disabled={occupata !== null} onClick={() => setDaEliminare(voce)}>{frasi.consElimina}</Button>}
                </Row>
              ))}
            </Card>
          </>
        ) : null}
      </div>
      <Dialog open={daEliminare !== null} title={frasi.consEliminaTitolo} onClose={() => setDaEliminare(null)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{frasi.consEliminaTesto}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={() => setDaEliminare(null)}>{frasi.uteAnnulla}</Button>
          <Button
            variant="bad"
            style={{ flex: 1 }}
            onClick={() => {
              const voce = daEliminare
              setDaEliminare(null)
              if (voce) void agisci(voce.id, () => callEliminaComunicazione(voce.id))
            }}
          >
            {frasi.consElimina}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
