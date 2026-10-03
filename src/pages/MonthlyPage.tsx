import { Link, useNavigate } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { Button } from '../components/ui/Button'
import { SectionTitle } from '../components/ui/SectionTitle'
import { ensureServiceSeed } from '../data/local/services'
import { useAppointments } from '../hooks/useAppointments'
import { useDogs } from '../hooks/useDogs'
import { useSession } from '../hooks/useSession'
import { bookHref, monthlyLists, type BookedRow, type ToBookRow } from '../lib/monthly'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'

function ToBookLine({ row, onBook }: { row: ToBookRow; onBook: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
      <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{row.dog.name}</div>
        <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.subtitle}</div>
      </div>
      <Button variant="ghost" onClick={onBook}>Fissa</Button>
    </div>
  )
}

function BookedLine({ row }: { row: BookedRow }) {
  return (
    <Link
      to={`/appuntamenti/${row.next.id}`}
      style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0, color: 'inherit', textDecoration: 'none' }}
    >
      <DogAvatar alt={row.dog.name} src={row.dog.photo} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700 }}>{row.dog.name}</span>
        <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.subtitle}</span>
      </span>
    </Link>
  )
}

export function MonthlyPage() {
  const navigate = useNavigate()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { dogs } = useDogs(uid)
  const { appointments } = useAppointments(uid)
  const services = uid ? ensureServiceSeed(uid) : []
  const now = new Date()
  const { toBook, booked } = monthlyLists(dogs, appointments, now)
  const empty = toBook.length === 0 && booked.length === 0
  return (
    <PhoneShell>
      <Header title="Clienti mensili" backTo="/" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px`, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {empty ? <p style={{ margin: 0, color: 'var(--tx3)', fontSize: TYPE.base }}>Nessun mensile</p> : null}
        {toBook.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Da fissare</SectionTitle>
            {toBook.map((row) => (
              <ToBookLine
                key={row.dog.id}
                row={row}
                onBook={() => navigate(bookHref(row.dog.id, appointments, services, now))}
              />
            ))}
          </section>
        ) : null}
        {booked.length > 0 ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionTitle>Fissati</SectionTitle>
            {booked.map((row) => <BookedLine key={row.dog.id} row={row} />)}
          </section>
        ) : null}
      </div>
    </PhoneShell>
  )
}
