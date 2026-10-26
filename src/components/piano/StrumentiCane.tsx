import { useState } from 'react'
import { useFrasi } from '../../i18n/LinguaContext'
import { useSettings } from '../../hooks/useSettings'
import { dateNonVenuti, etichettaAffidabilita } from '../../lib/affidabilita'
import { usePiano } from '../../hooks/usePiano'
import { strumentoVisibile } from '../../lib/funzioniPiano'
import { aggiungiNotaVocale, type NotaVocaleSalvata } from '../../lib/strumenti'

export function StrumentiCane({
  dogId,
  appuntamenti,
  note,
  onNota,
  microfono = typeof MediaRecorder !== 'undefined',
  adesso = new Date(),
}: {
  dogId: string
  appuntamenti: readonly { dogId: string; status: string; start: Date }[]
  note?: readonly NotaVocaleSalvata[]
  onNota: (note: NotaVocaleSalvata[]) => void
  microfono?: boolean
  adesso?: Date
}) {
  const frasi = useFrasi()
  const { settings } = useSettings()
  const piano = usePiano()
  const [registrando, setRegistrando] = useState(false)
  const noteAccese = strumentoVisibile('noteVocali', settings, piano.funzioni)
  const affidabilita = strumentoVisibile('affidabilita', settings, piano.funzioni)
    ? etichettaAffidabilita(dateNonVenuti(appuntamenti, dogId), adesso)
    : null
  const vocale = noteAccese && microfono
  if (!affidabilita && !vocale && !(note && note.length > 0 && noteAccese)) return null

  async function registra() {
    if (registrando) return
    const flusso = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(flusso)
    const pezzi: Blob[] = []
    recorder.addEventListener('dataavailable', (evento) => {
      if (evento.data.size > 0) pezzi.push(evento.data)
    })
    recorder.addEventListener('stop', () => {
      for (const traccia of flusso.getTracks()) traccia.stop()
      const blob = new Blob(pezzi, { type: recorder.mimeType || 'audio/webm' })
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : ''
        if (dataUrl) onNota(aggiungiNotaVocale(note, dataUrl, new Date(), crypto.randomUUID()))
      })
      reader.readAsDataURL(blob)
      setRegistrando(false)
    })
    setRegistrando(true)
    recorder.start()
    window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, 8000)
  }

  return (
    <div>
      {affidabilita ? <p>{frasi.strumSpesso}</p> : null}
      {vocale ? (
        <button type="button" onClick={() => { void registra() }}>{registrando ? frasi.strumNoteVocali : frasi.strumNoteVocali}</button>
      ) : null}
      {noteAccese ? (note ?? []).map((voce) => (
        <audio key={voce.id} controls src={voce.dataUrl} />
      )) : null}
    </div>
  )
}
