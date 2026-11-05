import { ChevronRight, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { callAnnunciaPagamenti } from '../../data/firebase/adminClient'
import { dataCorta } from '../../i18n/format'
import { useFrasi, useLingua } from '../../i18n/LinguaContext'
import { USER_TEXT } from '../../theme/text'
import { AIUTO, RIGA } from './comuni'

const GIORNO = 86_400_000

function oggiIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AnnuncioPagamenti({ annuncioIl }: { annuncioIl: string | null }) {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const [annuncio, setAnnuncio] = useState<'data' | 'conferma' | null>(null)
  const [dataAnnuncio, setDataAnnuncio] = useState(oggiIso)
  const [annunciando, setAnnunciando] = useState(false)
  const campo = { width: '100%', boxSizing: 'border-box' as const, font: 'inherit', padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'inherit' }
  const etichetta = { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }

  async function inviaAnnuncio() {
    if (annunciando) return
    setAnnunciando(true)
    try {
      const esito = await callAnnunciaPagamenti(new Date(`${dataAnnuncio}T09:00:00`).toISOString())
      setAnnuncio(null)
      toast.show(frasi.amAnnuncioFatto.replace('{{n}}', String(esito.email)), 'ok')
    } catch {
      toast.show(frasi.amAzioneKo, 'plain')
    } finally {
      setAnnunciando(false)
    }
  }

  return (
    <>
      <Card>
        <button
          type="button"
          disabled={annuncioIl !== null}
          onClick={() => setAnnuncio('data')}
          style={{ ...RIGA, borderTop: 'none', cursor: annuncioIl ? 'default' : 'pointer' }}
        >
          <Megaphone size={18} aria-hidden color="var(--pri)" />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontWeight: 700 }}>{frasi.amAnnuncio}</span>
            <span style={AIUTO}>
              {annuncioIl
                ? frasi.amAnnuncioInviato.replace('{{data}}', dataCorta(lingua, new Date(annuncioIl))).replace('{{dal}}', dataCorta(lingua, new Date(Date.parse(annuncioIl) + 15 * GIORNO)))
                : frasi.amAnnuncioAiuto}
            </span>
          </span>
          {annuncioIl ? null : <ChevronRight size={16} aria-hidden color="var(--tx3)" />}
        </button>
      </Card>

      <Dialog open={annuncio !== null} title={frasi.amAnnuncio} onClose={() => setAnnuncio(null)}>
        {annuncio === 'data' ? (
          <>
            <label style={etichetta}>
              {frasi.amAnnuncioData}
              <input type="date" value={dataAnnuncio} min={oggiIso()} onChange={(e) => setDataAnnuncio(e.target.value)} style={campo} />
            </label>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--tx2)', ...USER_TEXT }}>{frasi.amAnnuncioAiuto}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setAnnuncio(null)}>{frasi.uteAnnulla}</Button>
              <Button style={{ flex: 1 }} disabled={dataAnnuncio === ''} onClick={() => setAnnuncio('conferma')}>{frasi.amAvanti}</Button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, ...USER_TEXT }}>{frasi.amAnnuncioConferma}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setAnnuncio(null)}>{frasi.uteAnnulla}</Button>
              <Button variant="bad" style={{ flex: 1 }} disabled={annunciando} onClick={() => { void inviaAnnuncio() }}>{frasi.amInviaAnnuncio}</Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  )
}
