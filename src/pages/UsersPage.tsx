import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { Card, Row } from '../components/ui/Card'
import { SectionTitle } from '../components/ui/SectionTitle'
import { Toggle } from '../components/ui/Toggle'
import { callSetSalonPro, listSalonDirectory } from '../data/firebase/client'
import { useSession } from '../hooks/useSession'
import { accountSummary, salonSummary, type DirectoryEntry, type SalonDirectory } from '../lib/salonDirectory'
import { isOperator } from '../lib/salonPath'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { ShellFrame } from './ShellFrame'

type ProItem = { uid: string; salonId: string; enabled: boolean }

function proItems(directory: SalonDirectory): ProItem[] {
  const listed = Array.isArray(directory.pro) ? directory.pro : []
  return listed.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    if (typeof item.uid !== 'string' || typeof item.salonId !== 'string') return []
    return [{ uid: item.uid, salonId: item.salonId, enabled: item.enabled === true }]
  })
}

type SalonRow = { salonId: string; ownerName: string; salonName: string; enabled: boolean }

function ownerOf(entries: DirectoryEntry[], salonId: string, memberUids: ReadonlySet<string>): DirectoryEntry | undefined {
  return entries.find((entry) => entry.uid === salonId) ?? entries.find((entry) => memberUids.has(entry.uid))
}

function salonRows(directory: SalonDirectory): SalonRow[] {
  const items = proItems(directory)
  const rows: SalonRow[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.salonId === 'shared' || item.salonId.includes('/')) continue
    if (seen.has(item.salonId)) continue
    seen.add(item.salonId)
    const memberUids = new Set(items.filter((candidate) => candidate.salonId === item.salonId).map((candidate) => candidate.uid))
    const owner = ownerOf(directory.entries, item.salonId, memberUids)
    rows.push({
      salonId: item.salonId,
      ownerName: owner?.ownerName ?? 'Senza nome',
      salonName: owner?.salonName ?? '',
      enabled: item.enabled,
    })
  }
  return rows
}

export function UsersPage() {
  const session = useSession()
  const email = session.gate.kind === 'in' ? session.gate.account.email : null
  const operator = isOperator(email)
  const [directory, setDirectory] = useState<SalonDirectory | null>(null)
  const [error, setError] = useState(false)
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

  const rows = directory ? salonRows(directory) : []

  async function changePro(salonId: string, next: boolean) {
    setDenied((current) => {
      const copy = { ...current }
      delete copy[salonId]
      return copy
    })
    try {
      await callSetSalonPro(salonId, next)
      setTurned((current) => ({ ...current, [salonId]: next }))
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
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, ...USER_TEXT }}>
              {`${accountSummary(directory.accountCount)} · ${salonSummary(directory.salonCount)}`}
            </p>
            {directory.entries.length === 0 ? <p style={{ margin: 0 }}>Nessuna toelettatura</p> : null}
            <SectionTitle>Servizio Pro</SectionTitle>
            <Card>
              {rows.map((row, index) => {
                const enabled = row.salonId in turned ? turned[row.salonId] === true : row.enabled
                const problem = denied[row.salonId] ?? ''
                return (
                  <div key={row.salonId}>
                    <Row style={index === 0 ? { borderTop: 'none' } : undefined}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, ...USER_TEXT }}>{row.ownerName}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--tx3)', ...USER_TEXT }}>{row.salonName}</div>
                        <div style={{ ...USER_TEXT, color: enabled ? 'var(--ok)' : 'var(--tx3)' }}>{enabled ? 'Attivo' : 'Spento'}</div>
                      </div>
                      <Toggle
                        checked={enabled}
                        label={`Servizio Pro per ${row.ownerName}`}
                        onChange={(next) => { void changePro(row.salonId, next) }}
                      />
                    </Row>
                    {problem !== '' ? <p style={{ margin: 0, padding: `0 ${SIZES.row.padX}px ${SIZES.row.padY}px` }}>{problem}</p> : null}
                  </div>
                )
              })}
            </Card>
          </>
        ) : null}
      </div>
    </ShellFrame>
  )
}
