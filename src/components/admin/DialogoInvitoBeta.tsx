import { Send } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Sheet } from '../layout/Sheet'
import { Button } from '../ui/Button'
import { Segmented } from '../ui/Segmented'
import { useFrasi } from '../../i18n/LinguaContext'
import { GIORNI_BETA_MAX, MESSAGGIO_INVITO_MAX } from '../../lib/betaInvito'
import { USER_TEXT } from '../../theme/text'
import { CON_ICONA, Nota, SFUMATURA_PLUS, SFUMATURA_SALONE } from './comuni'

type Durata = '30' | '60' | '90' | 'libera'

export type SceltaInvito = { piano: 'pro' | 'salone'; giorni: number; messaggio: string }

/** Durata valida (1–365 interi) o null. */
export function giorniScelti(durata: Durata, altro: string): number | null {
  if (durata !== 'libera') return Number(durata)
  const n = Number(altro)
  return Number.isInteger(n) && n >= 1 && n <= GIORNI_BETA_MAX ? n : null
}

export function DialogoInvitoBeta({
  open,
  nomi,
  pianoIniziale,
  occupato,
  onClose,
  onInvia,
}: {
  open: boolean
  nomi: readonly string[]
  pianoIniziale: 'pro' | 'salone'
  occupato: boolean
  onClose: () => void
  onInvia: (scelta: SceltaInvito) => void
}) {
  const frasi = useFrasi()
  const [piano, setPiano] = useState(pianoIniziale)
  const [durata, setDurata] = useState<Durata>('60')
  const [altro, setAltro] = useState('')
  const [messaggio, setMessaggio] = useState('')
  const [apertoPrima, setApertoPrima] = useState(open)
  if (open !== apertoPrima) {
    setApertoPrima(open)
    if (open) {
      setPiano(pianoIniziale)
      setDurata('60')
      setAltro('')
      setMessaggio('')
    }
  }
  const giorni = giorniScelti(durata, altro)
  const n = nomi.length
  const sottotitolo = n <= 3 ? nomi.join(', ') : frasi.amEAltri.replace('{{nomi}}', nomi.slice(0, 3).join(', ')).replace('{{n}}', String(n - 3))
  const campo = { width: '100%', boxSizing: 'border-box' as const, font: 'inherit', padding: 10, border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'inherit' }
  const etichetta = { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }

  return (
    <Sheet
      open={open}
      title={frasi.amInvitaTitolo}
      onClose={onClose}
      closeButton
      footer={(
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>{frasi.uteAnnulla}</Button>
          <Button
            disabled={giorni === null || n === 0 || occupato}
            style={{ ...CON_ICONA, flex: 1.4, background: piano === 'pro' ? SFUMATURA_PLUS : SFUMATURA_SALONE, color: piano === 'pro' ? '#fff' : '#3A2700', border: 0 }}
            onClick={() => { if (giorni !== null) onInvia({ piano, giorni, messaggio: messaggio.trim() }) }}
          >
            <Send size={16} aria-hidden />
            {n === 1 ? frasi.amInviaUno : frasi.amInvia.replace('{{n}}', String(n))}
          </Button>
        </div>
      )}
    >
      <p style={{ margin: 0, color: 'var(--tx2)', ...USER_TEXT }}>{sottotitolo}</p>
      <div style={etichetta}>
        {frasi.amPiano}
        <div style={{ '--pri-solid': piano === 'pro' ? '#7B3FE4' : '#B07F00' } as CSSProperties}>
        <Segmented
          fill
          solid
          label={frasi.amPiano}
          value={piano}
          onChange={setPiano}
          options={[{ value: 'pro', label: 'Plus' }, { value: 'salone', label: 'Salon' }]}
        />
        </div>
      </div>
      <div style={etichetta}>
        {frasi.amDurata}
        <Segmented
          fill
          label={frasi.amDurata}
          value={durata}
          onChange={setDurata}
          options={[
            { value: '30', label: frasi.amGiorni.replace('{{n}}', '30') },
            { value: '60', label: frasi.amGiorni.replace('{{n}}', '60') },
            { value: '90', label: frasi.amGiorni.replace('{{n}}', '90') },
            { value: 'libera', label: frasi.amAltro },
          ]}
        />
      </div>
      {durata === 'libera' ? (
        <label style={etichetta}>
          {frasi.amGiorniAltro}
          <input type="number" inputMode="numeric" min={1} max={GIORNI_BETA_MAX} value={altro} onChange={(event) => setAltro(event.target.value)} style={campo} />
        </label>
      ) : null}
      <label style={etichetta}>
        {frasi.amMessaggio}
        <textarea value={messaggio} maxLength={MESSAGGIO_INVITO_MAX} rows={3} onChange={(event) => setMessaggio(event.target.value.slice(0, MESSAGGIO_INVITO_MAX))} style={{ ...campo, resize: 'vertical', fontWeight: 400 }} />
        <span style={{ alignSelf: 'flex-end', fontWeight: 500, color: 'var(--tx3)' }}>{frasi.amCaratteri.replace('{{n}}', String(messaggio.length)).replace('{{max}}', String(MESSAGGIO_INVITO_MAX))}</span>
      </label>
      <Nota>{frasi.amInvitaNota}</Nota>
    </Sheet>
  )
}
