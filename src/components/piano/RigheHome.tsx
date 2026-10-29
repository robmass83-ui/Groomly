import { Check } from 'lucide-react'
import { useFrasi } from '../../i18n/LinguaContext'

const riga = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
  minWidth: 0,
  flexWrap: 'nowrap',
} as const

const testo = {
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const tocco = {
  minHeight: 44,
  minWidth: 44,
  flex: 'none',
  border: 0,
  borderRadius: 8,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 650,
  padding: '0 8px',
  whiteSpace: 'nowrap',
} as const

export function RigaPromemoria({
  nome,
  quando,
  inviato,
  onCestino,
  nota,
}: {
  nome: string
  quando: string
  inviato: boolean
  onCestino: (() => void) | null
  nota?: string
}) {
  const frasi = useFrasi()
  const parola = nota && nota !== '' ? nota : inviato ? frasi.rigaInviato : frasi.rigaDaInviare
  return (
    <div style={riga}>
      <span style={testo}>{nome}</span>
      <span style={{ ...testo, color: 'var(--tx3)' }}>{quando}</span>
      <span style={{ ...testo, fontWeight: 650 }}>{frasi.codaPromemoria}</span>
      {inviato && !nota ? (
        <Check size={16} strokeWidth={2} aria-label={parola} role="img" color="var(--ok)" />
      ) : (
        <span role="img" aria-label={parola} style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--bad)', flex: 'none' }} />
      )}
      <span style={{ ...testo, fontWeight: 650, color: nota ? 'var(--bad)' : 'inherit' }}>{parola}</span>
      {onCestino ? (
        <button type="button" onClick={onCestino} style={tocco}>{frasi.rigaCestino}</button>
      ) : null}
    </div>
  )
}

export function RigaAuguri({
  nome,
  onSi,
  onCestino,
  errore,
}: {
  nome: string
  onSi: () => void
  onCestino: () => void
  errore?: string
}) {
  const frasi = useFrasi()
  return (
    <div style={riga}>
      <span style={{ ...testo, flex: 1 }}>{frasi.rigaAuguriDomanda.replace('{{cane}}', nome)}</span>
      {errore ? <span style={{ ...testo, color: 'var(--bad)' }}>{errore}</span> : null}
      <button type="button" onClick={onSi} style={tocco}>{frasi.rigaSi}</button>
      <button type="button" onClick={onCestino} style={tocco}>{frasi.rigaCestino}</button>
    </div>
  )
}
