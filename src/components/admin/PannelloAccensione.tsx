import { useCallback, useEffect, useState } from 'react'
import { Check, Lock, Power, X } from 'lucide-react'
import { accendiAbbonamenti, confermaPartitaIva, controlloAccensione, spegniAbbonamenti } from '../../data/firebase/abbonamentiClient'
import { useFrasi } from '../../i18n/LinguaContext'
import type { Controllo, VoceControllo } from '../../lib/accensione'
import { Dialog } from '../layout/Dialog'
import { useToast } from '../layout/Toast'
import { Button } from '../ui/Button'

type Frasi = ReturnType<typeof useFrasi>
type Dialogo = 'accendi' | 'parola' | 'spegni' | null

function giorno(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

function testiVoce(v: VoceControllo, frasi: Frasi): { titolo: string; dettagli: string[] } {
  switch (v.id) {
    case 'chiave':
      return { titolo: frasi.b4VoceChiave, dettagli: [v.ok ? frasi.b4ChiaveOk : frasi.b4ChiaveManca] }
    case 'offering': {
      if (v.errore) return { titolo: frasi.b4VoceOffering, dettagli: [frasi.b4OfferingAccesso] }
      const dettagli = [frasi.b4OfferingN.replace('{{n}}', String(v.trovati)).replace('{{tot}}', String(v.attesi))]
      if (v.mancanti.length) dettagli.push(frasi.b4OfferingMancano.replace('{{elenco}}', v.mancanti.join(', ')))
      return { titolo: frasi.b4VoceOffering, dettagli }
    }
    case 'webhook':
      return { titolo: frasi.b4VoceWebhook, dettagli: [v.ultimoEventoIl ? frasi.b4WebhookUltimo.replace('{{data}}', giorno(v.ultimoEventoIl)) : frasi.b4WebhookNessuno] }
    case 'annuncio': {
      if (!v.inviatoIl) return { titolo: frasi.b4VoceAnnuncio, dettagli: [frasi.b4AnnuncioNo] }
      const dettagli = [frasi.b4AnnuncioInviato.replace('{{data}}', giorno(v.inviatoIl)).replace('{{dal}}', giorno(v.pagamentiDal))]
      if (v.mancanoGiorni > 0) dettagli.push(frasi.b4AnnuncioMancano.replace('{{n}}', String(v.mancanoGiorni)))
      return { titolo: frasi.b4VoceAnnuncio, dettagli }
    }
    case 'conferma':
      return { titolo: frasi.b4VoceConferma, dettagli: [v.confermatoIl ? frasi.b4ConfermaIl.replace('{{data}}', giorno(v.confermatoIl)) : frasi.b4ConfermaDaFare] }
  }
}

function Cerchio({ ok }: { ok: boolean }) {
  const Icona = ok ? Check : X
  return (
    <span aria-hidden style={{ width: 22, height: 22, borderRadius: 11, flex: 'none', display: 'grid', placeItems: 'center', background: ok ? 'var(--ok)' : 'var(--bad)', color: '#fff' }}>
      <Icona size={13} strokeWidth={3} />
    </span>
  )
}

// Pannello di accensione degli abbonamenti (spec admin §7.3). Il controllo lo fa il server: qui si mostra e si conferma.
export function PannelloAccensione() {
  const frasi = useFrasi()
  const toast = useToast()
  const [controllo, setControllo] = useState<Controllo | null>(null)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [parola, setParola] = useState('')
  const [occupato, setOccupato] = useState(false)

  const ricarica = useCallback(async () => {
    try {
      setControllo(await controlloAccensione())
    } catch {
      toast.show(frasi.b4ErroreAdmin, 'plain')
    }
  }, [frasi.b4ErroreAdmin, toast])

  useEffect(() => {
    void ricarica()
  }, [ricarica])

  async function azione(fare: () => Promise<void>) {
    setOccupato(true)
    try {
      await fare()
      setDialogo(null)
      setParola('')
    } catch (error) {
      toast.show(error instanceof Error && error.message ? error.message : frasi.b4ErroreAdmin, 'plain')
    } finally {
      setOccupato(false)
      await ricarica()
    }
  }

  if (!controllo) return <p style={{ margin: 0, color: 'var(--tx3)', fontSize: 14 }}>{frasi.b4Controllo}</p>

  const conferma = controllo.voci.find((v) => v.id === 'conferma')
  const parolaGiusta = parola.trim().toUpperCase() === frasi.b4ParolaAccendi

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ background: '#1B2533', color: '#fff', borderRadius: 12, padding: '18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
        <span aria-hidden style={{ width: 52, height: 52, borderRadius: 26, display: 'grid', placeItems: 'center', background: controllo.tuttoVerde || controllo.attivi ? '#2E9E5B' : '#C8463D' }}>
          <Power size={26} strokeWidth={2.4} />
        </span>
        <h3 style={{ margin: 0, fontSize: 17 }}>{controllo.attivi ? frasi.b4Attivi : frasi.b4Spenti}</h3>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{frasi.b4Pronti.replace('{{n}}', String(controllo.pronti))}</p>
        <div aria-hidden style={{ display: 'flex', gap: 4, width: '100%', maxWidth: 260 }}>
          {controllo.voci.map((v) => <span key={v.id} style={{ flex: 1, height: 5, borderRadius: 3, background: v.ok ? '#2E9E5B' : 'rgba(255,255,255,.22)' }} />)}
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, background: 'var(--card)', borderRadius: 12, border: '1px solid var(--line)' }}>
        {controllo.voci.map((v, indice) => {
          const { titolo, dettagli } = testiVoce(v, frasi)
          return (
            <li key={v.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', minHeight: 44, borderTop: indice === 0 ? 'none' : '1px solid var(--line)' }}>
              <Cerchio ok={v.ok} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {v.id === 'conferma' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={conferma?.ok === true}
                      disabled={occupato}
                      onChange={(event) => { void azione(() => confermaPartitaIva(event.target.checked)) }}
                      style={{ width: 20, height: 20 }}
                    />
                    {titolo}
                  </label>
                ) : <div style={{ fontWeight: 700, fontSize: 14 }}>{titolo}</div>}
                {dettagli.map((d) => <div key={d} style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 2, overflowWrap: 'anywhere' }}>{d}</div>)}
              </div>
            </li>
          )
        })}
      </ul>
      {controllo.attivi ? (
        <Button variant="bad" onClick={() => setDialogo('spegni')}>{frasi.b4Spegni}</Button>
      ) : (
        <Button disabled={!controllo.tuttoVerde || occupato} onClick={() => setDialogo('accendi')}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {controllo.tuttoVerde ? null : <Lock aria-hidden size={16} />}
            {frasi.b4Accendi}
          </span>
        </Button>
      )}
      <Dialog open={dialogo === 'accendi'} title={frasi.b4AccendiTitolo} onClose={() => setDialogo(null)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.b4AccendiTesto}</p>
        <Button onClick={() => setDialogo('parola')}>{frasi.b4Continua}</Button>
        <Button variant="secondary" onClick={() => setDialogo(null)}>{frasi.b4Annulla}</Button>
      </Dialog>
      <Dialog open={dialogo === 'parola'} title={frasi.b4AccendiTitolo} onClose={() => { setDialogo(null); setParola('') }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 600 }}>
          {frasi.b4ScriviParola.replace('{{parola}}', frasi.b4ParolaAccendi)}
          <input
            value={parola}
            autoCapitalize="characters"
            autoComplete="off"
            onChange={(event) => setParola(event.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', font: 'inherit', fontWeight: 400, padding: 8, border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', color: 'inherit' }}
          />
        </label>
        <Button disabled={!parolaGiusta || occupato} onClick={() => { void azione(() => accendiAbbonamenti(frasi.b4ParolaAccendi)) }}>{frasi.b4Accendi}</Button>
      </Dialog>
      <Dialog open={dialogo === 'spegni'} title={frasi.b4Spegni} onClose={() => setDialogo(null)}>
        <p style={{ margin: 0, lineHeight: 1.45 }}>{frasi.b4SpegniTesto}</p>
        <Button variant="bad" disabled={occupato} onClick={() => { void azione(spegniAbbonamenti) }}>{frasi.b4Spegni}</Button>
        <Button variant="secondary" onClick={() => setDialogo(null)}>{frasi.b4Annulla}</Button>
      </Dialog>
    </section>
  )
}
