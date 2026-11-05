import { useCallback, useEffect, useState } from 'react'
import { useAdminDati } from '../../components/admin/AdminDati'
import { AIUTO } from '../../components/admin/comuni'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Button } from '../../components/ui/Button'
import { Card, Row } from '../../components/ui/Card'
import { AttesaRiga } from '../../components/ui/Zampette'
import { elencoAdminLog, LIMITE_REGISTRO, type VoceRegistro } from '../../data/firebase/adminClient'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { USER_TEXT } from '../../theme/text'
import { CORPO } from './comune'

const CAMPO = { font: 'inherit', flex: 1, minWidth: 0, padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--tx)' } as const

function testoDettagli(dettagli: Record<string, unknown>): string {
  return Object.entries(dettagli).map(([chiave, valore]) => `${chiave}: ${typeof valore === 'string' ? valore : JSON.stringify(valore)}`).join(' · ')
}

export function RegistroPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const { nomeDi } = useAdminDati()
  const [voci, setVoci] = useState<VoceRegistro[] | null>(null)
  const [altre, setAltre] = useState(false)
  const [errore, setErrore] = useState(false)
  const [azione, setAzione] = useState('')
  const [salone, setSalone] = useState('')
  const [filtro, setFiltro] = useState({ azione: '', salonId: '' })

  const carica = useCallback((dopo?: string) => {
    setErrore(false)
    void elencoAdminLog({ ...(filtro.azione ? { azione: filtro.azione } : {}), ...(filtro.salonId ? { salonId: filtro.salonId } : {}), ...(dopo ? { dopo } : {}) })
      .then((lista) => {
        setVoci((attuali) => (dopo ? [...(attuali ?? []), ...lista] : lista))
        setAltre(lista.length === LIMITE_REGISTRO)
      })
      .catch(() => setErrore(true))
  }, [filtro])

  useEffect(() => carica(), [carica])

  return (
    <>
      <TestataAdmin titolo={frasi.consRegistro} />
      <div style={CORPO}>
        <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); setFiltro({ azione: azione.trim(), salonId: salone.trim() }) }}>
          <input aria-label={frasi.consAzione} placeholder={frasi.consAzione} value={azione} onChange={(e) => setAzione(e.target.value)} style={CAMPO} />
          <input aria-label={frasi.consSalone} placeholder={frasi.consSalone} value={salone} onChange={(e) => setSalone(e.target.value)} style={CAMPO} />
          <button type="submit" hidden aria-hidden />
        </form>
        {errore ? <p style={{ margin: 0 }}>{frasi.consRegistroKo}</p> : voci === null ? <AttesaRiga testo={frasi.uteCarica} /> : voci.length === 0 ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{frasi.consRegistroVuoto}</p> : (
          <Card>
            {voci.map((voce, indice) => (
              <Row key={voce.id} style={indice === 0 ? { borderTop: 'none' } : undefined}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, ...USER_TEXT }}>{voce.azione}</div>
                  <div style={AIUTO}>{[voce.quando ? dataCorta(lingua, new Date(voce.quando)) : '', voce.salonId ? nomeDi(voce.salonId) : ''].filter((p) => p !== '').join(' · ')}</div>
                  {Object.keys(voce.dettagli).length > 0 ? <div style={AIUTO}>{testoDettagli(voce.dettagli)}</div> : null}
                </div>
              </Row>
            ))}
          </Card>
        )}
        {altre && voci ? <Button variant="secondary" onClick={() => carica(voci[voci.length - 1]?.quando)}>{frasi.consAltri}</Button> : null}
      </div>
    </>
  )
}
