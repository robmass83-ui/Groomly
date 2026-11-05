import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useVociAdmin } from '../../components/admin/AdminLayout'
import { Bollino, RIGA } from '../../components/admin/comuni'
import { TestataAdmin } from '../../components/admin/TestataAdmin'
import { Card } from '../../components/ui/Card'
import { useFrasi } from '../../i18n/LinguaContext'
import { CORPO } from './comune'

/** Sul telefono le voci che non stanno nella barra in basso. */
export function AltroPage() {
  const frasi = useFrasi()
  const { altre } = useVociAdmin()
  return (
    <>
      <TestataAdmin titolo={frasi.consAltro} />
      <div style={CORPO}>
        <Card>
          {altre.map(({ to, nome, icona: Icona, nuovi }, indice) => (
            <Link key={to} to={to} style={{ ...RIGA, borderTop: indice === 0 ? 'none' : RIGA.borderTop, textDecoration: 'none' }}>
              <Icona size={18} strokeWidth={2} aria-hidden color="var(--tx2)" />
              <span style={{ flex: 1, fontWeight: 600 }}>{nome}</span>
              <Bollino n={nuovi ?? 0} etichetta={frasi.amNuovi.replace('{{n}}', String(nuovi ?? 0))} />
              <ChevronRight size={16} strokeWidth={2} aria-hidden color="var(--tx3)" />
            </Link>
          ))}
        </Card>
      </div>
    </>
  )
}
