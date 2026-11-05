import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../layout/Sheet'
import { Card } from '../ui/Card'
import { SearchBar } from '../ui/SearchBar'
import { SectionTitle } from '../ui/SectionTitle'
import { useFrasi } from '../../i18n/LinguaContext'
import { FILTRI_VUOTI, filtraSaloni, nomeSalone } from '../../lib/adminManager'
import { percorsoSalone } from '../../lib/percorsoAdmin'
import { useAdminDati } from './AdminDati'
import { useVociAdmin } from './AdminLayout'
import { AIUTO, AvatarSalone, MarchioLivello, NOME, RIGA } from './comuni'

const MAX_SALONI = 6

/** Ricerca veloce della Console: saloni e pagine insieme, dal telefono e con Ctrl+K dal PC. */
export function RicercaAdmin({ onChiudi }: { onChiudi: () => void }) {
  const frasi = useFrasi()
  const navigate = useNavigate()
  const { righe, adesso } = useAdminDati()
  const { principali, altre } = useVociAdmin()
  const campo = useRef<HTMLInputElement>(null)
  const [testo, setTesto] = useState('')
  const cerca = testo.trim().toLowerCase()
  const saloni = cerca === '' ? [] : filtraSaloni(righe, { ...FILTRI_VUOTI, testo }, adesso).slice(0, MAX_SALONI)
  const pagine = [...principali, ...altre].filter((voce) => voce.nome.toLowerCase().includes(cerca))

  useEffect(() => {
    campo.current?.focus()
  }, [])

  const vai = (percorso: string) => {
    onChiudi()
    navigate(percorso)
  }

  return (
    <Sheet open title={frasi.consCerca} onClose={onChiudi} closeButton>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SearchBar mode="input" placeholder={frasi.consCercaOvunque} value={testo} onChange={setTesto} inputRef={campo} />
        {saloni.length > 0 ? (
          <>
            <SectionTitle>{frasi.amTabSaloni}</SectionTitle>
            <Card>
              {saloni.map(({ row, livello, info }, indice) => (
                <button key={row.salonId} type="button" onClick={() => vai(percorsoSalone(row.salonId))} style={{ ...RIGA, gap: 12, borderTop: indice === 0 ? 'none' : RIGA.borderTop }}>
                  <AvatarSalone id={row.salonId} nome={nomeSalone(row)} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={NOME}>{nomeSalone(row)}</span>
                    <span style={AIUTO}>{[row.ownerName, info.citta].filter(Boolean).join(' · ')}</span>
                  </span>
                  <MarchioLivello livello={livello} />
                </button>
              ))}
            </Card>
          </>
        ) : null}
        {pagine.length > 0 ? (
          <>
            <SectionTitle>{frasi.consPagine}</SectionTitle>
            <Card>
              {pagine.map(({ to, nome, icona: Icona }, indice) => (
                <button key={to} type="button" onClick={() => vai(to)} style={{ ...RIGA, gap: 12, borderTop: indice === 0 ? 'none' : RIGA.borderTop }}>
                  <Icona size={18} strokeWidth={2} aria-hidden color="var(--tx2)" />
                  <span style={{ flex: 1, fontWeight: 600 }}>{nome}</span>
                </button>
              ))}
            </Card>
          </>
        ) : null}
        {saloni.length === 0 && pagine.length === 0 ? <span style={AIUTO}>{frasi.consNessunRisultato}</span> : null}
      </div>
    </Sheet>
  )
}
