import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { callSetSalonPro, listSalonDirectory } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { accountSummary, salonSummary, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator, SHARED_SALON_ID } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { ShellFrame } from './ShellFrame'

type ProRow = { uid: string; salonId: string; enabled: boolean }

function proRows(directory: SalonDirectory): ProRow[] {
  const listed = Array.isArray(directory.pro) ? directory.pro : []
  return listed.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (typeof item.uid !== 'string' || typeof item.salonId !== 'string') return []
    return [{ uid: item.uid, salonId: item.salonId, enabled: item.enabled === true }]
  })
}

export function UsersPage() {
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [turned, setTurned] = useState<Record<string, boolean>>({})
  const [denied, setDenied] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!operator) return
    let active = true
    void listSalonDirectory()
      .then((result) => {
        if (active) setDirectory(result)
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [operator])

  if (!operator) return <Navigate to="/impostazioni" replace />

  const rows = directory ? proRows(directory) : []
  const proByUid = new Map(rows.map((row) => [row.uid, row]))

  async function togglePro(salonId: string, enabled: boolean) {
    setDenied((current) => {
      const next = { ...current }
      delete next[salonId]
      return next
    })
    try {
      await callSetSalonPro(salonId, !enabled)
      setTurned((current) => ({ ...current, [salonId]: !enabled }))
    } catch {
      setDenied((current) => ({ ...current, [salonId]: 'Accesso negato' }))
    }
  }

  return (
    <ShellFrame>
      <Header title="Utenti" backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {error ? <p style={{ margin: 0 }}>Elenco non disponibile</p> : null}
        {!error && !directory ? <p style={{ margin: 0 }}>Caricamento…</p> : null}
        {directory ? (
          <>
            <input
              aria-label="Cerca"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ height: SIZES.search.h, borderRadius: SIZES.search.radius, border: '1px solid var(--line)', background: 'var(--surf)', color: 'var(--tx)', padding: '0 10px', font: 'inherit' }}
            />
            <Card style={{ padding: `${SIZES.row.padY}px ${SIZES.row.padX}px`, fontSize: 17, fontWeight: 700 }}>
              <div>{accountSummary(directory.accountCount)}</div>
              <div>{salonSummary(directory.salonCount)}</div>
            </Card>
            {directory.entries.length === 0 ? <p style={{ margin: 0 }}>Nessuna toelettatura</p> : null}
            {directory.entries.filter((entry) => {
              const needle = query.trim().toLowerCase()
              if (!needle) return true
              return entry.ownerName.toLowerCase().includes(needle) || entry.salonName.toLowerCase().includes(needle)
            }).map((entry) => {
              const row = proByUid.get(entry.uid)
              const salonId = row?.salonId ?? ''
              const showPro = salonId !== '' && salonId !== SHARED_SALON_ID
              const enabled = salonId in turned ? turned[salonId] === true : row?.enabled === true
              const problem = denied[salonId] ?? ''
              return (
                <div key={entry.uid}>
                  <Card>
                    <Row style={{ borderTop: 'none', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                      <div style={{ fontWeight: 600, width: '100%', ...USER_TEXT }}>{entry.ownerName}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--tx3)', width: '100%', ...USER_TEXT }}>{entry.salonName}</div>
                    </Row>
                    {showPro ? (
                      <div style={{ padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>
                        <Button
                          style={{ width: '100%' }}
                          onClick={() => { void togglePro(salonId, enabled) }}
                        >
                          {enabled ? 'Spegni Pro' : 'Attiva Pro'}
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                  {showPro && problem !== '' ? <p style={{ margin: 0 }}>{problem}</p> : null}
                </div>
              )
            })}
          </>
        ) : null}
      </div>
    </ShellFrame>
  )
}
