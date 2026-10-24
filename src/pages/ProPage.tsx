import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { SectionHeader } from '../components/ui/SectionTitle'
import { useSession } from '../hooks/useSession'
import { PRO_SEAT_LIMIT, createInviteDecision, roleLabel, usedSeats } from '../lib/salonAccess'
import { SHARED_SALON_ID, isSharedEmail, type AccountRole } from '../lib/salonPath'
import { rosterLabel, type SalonAccess, type SalonMember } from '../lib/salonRoster'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type InviteRole = 'socio' | 'collaboratore'

const choice: CSSProperties = {
  minHeight: 44,
  padding: '0 12px',
  borderRadius: 8,
  border: '1px solid var(--line)',
  font: 'inherit',
  fontWeight: 700,
}

function personRole(role: AccountRole): string {
  if (role === 'socio' || role === 'collaboratore') return roleLabel(role)
  return 'Titolare'
}

function callableMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    const split = message.indexOf(': ')
    if (split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split))) return message.slice(split + 2)
    return message
  }
  return 'Invio non riuscito'
}

function RoleButton({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{ ...choice, background: pressed ? 'var(--pri-s)' : 'var(--card)', color: 'var(--tx)' }}
    >
      {children}
    </button>
  )
}

export function ProPage() {
  const session = useSession()
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const salonId = !account
    ? ''
    : account.salonId || (isSharedEmail(account.email) ? SHARED_SALON_ID : account.uid)
  const callerRole: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  const shared = salonId === SHARED_SALON_ID
  const [seen, setSeen] = useState(shared)
  const [access, setAccess] = useState<SalonAccess>({ enabled: false, members: [], openInviteExpiries: [] })
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('collaboratore')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)
  const inactive = shared || (seen && !access.enabled)
  const invites = access.openInviteExpiries.map((expiresAt) => ({ status: 'aperto', expiresAt }))
  const seats = usedSeats(access.members, invites, new Date())
  const people = access.members
    .filter((member) => member.status === 'attivo')
    .slice()
    .sort((left, right) => {
      const rank = { titolare: 0, socio: 1, collaboratore: 2 }
      const byRole = rank[left.role] - rank[right.role]
      if (byRole !== 0) return byRole
      return rosterLabel(left).localeCompare(rosterLabel(right), 'it')
    })

  useEffect(() => {
    if (salonId === '' || shared) return
    let cancelled = false
    let stopAccess = () => {}
    void import('../data/firebase/client').then(async (mod) => {
      const stopA = await mod.watchSalonAccess(salonId, (next) => {
        if (cancelled) return
        setAccess(next)
        setSeen(true)
      })
      if (cancelled) {
        stopA()
        return
      }
      stopAccess = stopA
    }).catch(() => {
      if (cancelled) return
      setAccess({ enabled: false, members: [], openInviteExpiries: [] })
      setSeen(true)
    })
    return () => {
      cancelled = true
      stopAccess()
    }
  }, [salonId, shared])

  async function send(event: FormEvent) {
    event.preventDefault()
    if (sending || inactive) return
    setNotice('')
    const decision = createInviteDecision({
      caller: { salonId, role: callerRole },
      proEnabled: true,
      email,
      role: inviteRole,
      members: access.members,
      invites,
      now: new Date(),
    })
    if (!decision.ok) {
      setError(decision.message)
      return
    }
    setError('')
    setSending(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.callCreateInvite(decision.email, decision.role)
      setNotice(`Invito spedito a ${decision.email}`)
      setEmail('')
    } catch (caught) {
      setError(callableMessage(caught))
    } finally {
      setSending(false)
    }
  }

  async function revoke(member: SalonMember) {
    setProblem('')
    try {
      const mod = await import('../data/firebase/client')
      await mod.callRevokeMember(member.uid)
    } catch (caught) {
      setProblem(callableMessage(caught))
    }
  }

  async function changeRole(member: SalonMember, next: InviteRole) {
    if (member.role === next) return
    setProblem('')
    try {
      const mod = await import('../data/firebase/client')
      await mod.callChangeMemberRole(member.uid, next)
    } catch (caught) {
      setProblem(callableMessage(caught))
    }
  }

  return (
    <ShellFrame>
      <Header title="Funzioni Pro" backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {!shared && !seen ? null : inactive ? (
          <Card>
            <p style={{ margin: 0, padding: '12px 9px', ...USER_TEXT }}>Non attivo</p>
          </Card>
        ) : (
          <>
            <p style={{ margin: 0, fontWeight: 700, ...USER_TEXT }}>{`${seats} di ${PRO_SEAT_LIMIT} posti`}</p>
            {people.length === 0 ? null : (
            <Card>
              {people.map((member, index) => {
                const label = rosterLabel(member)
                const staff = member.role === 'socio' || member.role === 'collaboratore'
                return (
                  <div key={member.uid} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 9px', borderTop: index === 0 ? 'none' : '1px solid var(--line)', minHeight: 44 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{label}</span>
                        {label !== member.email ? <span style={{ display: 'block', color: 'var(--tx3)', fontSize: TYPE.meta }}>{member.email}</span> : null}
                        <span style={{ display: 'block', color: 'var(--tx2)', fontSize: TYPE.meta }}>{personRole(member.role)}</span>
                      </span>
                      {staff ? (
                        <button type="button" aria-label={`Revoca ${label}`} onClick={() => { void revoke(member) }} style={{ ...choice, background: 'transparent', color: 'var(--bad)' }}>
                          Revoca
                        </button>
                      ) : null}
                    </div>
                    {staff ? (
                      <div role="group" aria-label={`Ruolo di ${label}`} style={{ display: 'flex', gap: 8 }}>
                        <RoleButton pressed={member.role === 'socio'} onClick={() => { void changeRole(member, 'socio') }}>Socio</RoleButton>
                        <RoleButton pressed={member.role === 'collaboratore'} onClick={() => { void changeRole(member, 'collaboratore') }}>Collaboratore</RoleButton>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </Card>
            )}
            {problem ? <p style={{ margin: 0, color: 'var(--bad)', ...USER_TEXT }}>{problem}</p> : null}
            <Card>
              <form aria-label="Invita" onSubmit={(event) => { void send(event) }} style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '9px 9px 11px' }}>
                <SectionHeader>Invita</SectionHeader>
                <Input label="Email" type="email" value={email} error={error || undefined} onChange={(event) => setEmail(event.target.value)} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <RoleButton pressed={inviteRole === 'socio'} onClick={() => setInviteRole('socio')}>Socio</RoleButton>
                  <RoleButton pressed={inviteRole === 'collaboratore'} onClick={() => setInviteRole('collaboratore')}>Collaboratore</RoleButton>
                </div>
                <Button type="submit" disabled={sending}>Invia</Button>
                {notice ? <p style={{ margin: 0, ...USER_TEXT }}>{notice}</p> : null}
              </form>
            </Card>
          </>
        )}
      </div>
    </ShellFrame>
  )
}
