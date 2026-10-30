import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Toggle } from '../components/ui/Toggle'
import { useSession } from '../hooks/useSession'
import { useFrasi } from '../i18n/LinguaContext'
import { PRO_SEAT_LIMIT, createInviteDecision, roleLabel, usedSeats } from '../lib/salonAccess'
import { SHARED_SALON_ID, isOperator, isSharedEmail, type AccountRole } from '../lib/salonPath'
import { rosterLabel, type SalonAccess, type SalonMember } from '../lib/salonRoster'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type InviteRole = 'socio' | 'collaboratore'

const chip: CSSProperties = {
  height: 26,
  padding: '0 8px',
  borderRadius: 8,
  background: 'var(--pri-solid)',
  color: 'var(--on-pri)',
  fontSize: 12,
  fontWeight: 650,
  lineHeight: '26px',
  whiteSpace: 'nowrap',
}

function personRole(role: AccountRole, titolare: string): string {
  if (role === 'socio' || role === 'collaboratore') return roleLabel(role)
  return titolare
}

function callableMessage(error: unknown, fallito: string, riprova: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    const message = error.message.trim()
    if (/\[500\]|\bINTERNAL\b/i.test(message)) return riprova
    const split = message.indexOf(': ')
    if (split > 0 && /^[a-z0-9/-]+$/.test(message.slice(0, split))) return message.slice(split + 2)
    return message
  }
  return fallito
}

function RoleChoice({ value, onChange }: { value: InviteRole; onChange: (role: InviteRole) => void }) {
  const frasi = useFrasi()
  return (
    <div role="group" aria-label={frasi.proRuolo} style={{ display: 'inline-flex', alignSelf: 'flex-start', border: '1px solid var(--line2)', borderRadius: 8, overflow: 'hidden' }}>
      {(['socio', 'collaboratore'] as const).map((role) => (
        <button
          key={role}
          type="button"
          aria-pressed={value === role}
          onClick={() => onChange(role)}
          style={{
            height: 26,
            padding: '0 8px',
            border: 0,
            borderRight: role === 'socio' ? '1px solid var(--line2)' : 0,
            background: value === role ? 'var(--pri-solid)' : 'transparent',
            color: value === role ? 'var(--on-pri)' : 'var(--tx)',
            font: 'inherit',
            fontSize: 12,
            fontWeight: 650,
            whiteSpace: 'nowrap',
          }}
        >
          {roleLabel(role)}
        </button>
      ))}
    </div>
  )
}

export function ProPage({ titolo }: { titolo?: string }) {
  const session = useSession()
  const frasi = useFrasi()
  const titoloPagina = titolo ?? frasi.impFunzioni
  const account = session.gate.kind === 'in' ? session.gate.account : null
  const salonId = !account
    ? ''
    : account.salonId || (isSharedEmail(account.email) ? SHARED_SALON_ID : account.uid)
  const callerRole: AccountRole = account?.role === 'socio' || account?.role === 'collaboratore' ? account.role : 'titolare'
  const operator = isOperator(account?.email)
  const [seen, setSeen] = useState(false)
  const [access, setAccess] = useState<SalonAccess>({ enabled: false, members: [], openInviteExpiries: [] })
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('collaboratore')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  const [sending, setSending] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const inactive = seen && !access.enabled
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
    if (salonId === '') return
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
  }, [salonId])

  async function togglePro() {
    if (switching || salonId === '') return
    setSwitchError('')
    setSwitching(true)
    const next = !access.enabled
    try {
      const mod = await import('../data/firebase/client')
      await mod.callSetSalonPro(salonId, next)
      setAccess((current) => ({ ...current, enabled: next }))
    } catch {
      setSwitchError(frasi.uteNegato)
    } finally {
      setSwitching(false)
    }
  }

  function openInvite() {
    setError('')
    setNotice('')
    setInviteOpen(true)
  }

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
      seatLimit: access.seats ?? PRO_SEAT_LIMIT,
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
      setError(callableMessage(caught, frasi.invitoInvio, frasi.impInvioRiprova))
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
      setProblem(callableMessage(caught, frasi.invitoInvio, frasi.impInvioRiprova))
    }
  }

  return (
    <ShellFrame>
      <Header title={titoloPagina} backTo="/impostazioni" />
      <div style={{ padding: SIZES.pagePadX, display: 'flex', flexDirection: 'column', gap: SIZES.sectionGap }}>
        {!seen ? null : (
          <>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 48, padding: '8px 12px' }}>
                <span aria-hidden style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--pri-s)', color: 'var(--pri-ink)', display: 'grid', placeItems: 'center', flex: 'none' }}>
                  <Sparkles size={16} strokeWidth={1.8} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{frasi.impPiano}</span>
                  <span style={{ display: 'block', color: 'var(--tx2)', fontSize: TYPE.meta }}>
                    <span style={{ color: access.enabled ? 'var(--ok)' : 'var(--tx2)', fontWeight: 700 }}>{access.enabled ? frasi.servAttivo : frasi.proNonAttivo}</span>
                    {access.enabled ? <> · <span>{seats} di {access.seats ?? PRO_SEAT_LIMIT} posti</span></> : null}
                  </span>
                </span>
                {operator ? (
                  <Toggle checked={access.enabled} disabled={switching} label={frasi.impPiano} onChange={() => { void togglePro() }} />
                ) : null}
              </div>
              <p style={{ margin: 0, padding: '0 12px 10px', color: 'var(--tx2)', fontSize: 13, lineHeight: 1.35 }}>
                {access.enabled
                  ? frasi.proRuoloDettaglio
                  : frasi.proAccendi}
              </p>
              {switchError ? <p style={{ margin: 0, padding: '0 12px 10px', color: 'var(--bad)', ...USER_TEXT }}>{switchError}</p> : null}
            </Card>
            {inactive ? null : (
              <Card>
                {people.map((member, index) => {
                  const label = rosterLabel(member)
                  const staff = member.role === 'socio' || member.role === 'collaboratore'
                  return (
                    <div key={member.uid} style={{ padding: '8px 12px 9px', borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 28 }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', ...USER_TEXT }}>{label}</span>
                        {staff ? <span style={chip}>{personRole(member.role, frasi.impTitolare)}</span> : null}
                        {staff && member.uid !== account?.uid ? (
                          <button type="button" aria-label={`Revoca ${label}`} onClick={() => { void revoke(member) }} style={{ marginLeft: 'auto', height: 26, padding: 0, border: 0, background: 'transparent', color: 'var(--bad)', font: 'inherit', fontSize: 12, fontWeight: 650 }}>
                            Revoca
                          </button>
                        ) : null}
                      </div>
                      <span style={{ display: 'block', marginTop: 1, color: 'var(--tx2)', fontSize: 13, overflowWrap: 'anywhere' }}>
                        {staff ? (label === member.email ? '' : member.email) : `${frasi.impTitolare}${label === member.email ? '' : ` · ${member.email}`}`}
                      </span>
                    </div>
                  )
                })}
                {problem ? <p style={{ margin: 0, padding: '0 12px 8px', color: 'var(--bad)', ...USER_TEXT }}>{problem}</p> : null}
                <button
                  type="button"
                  onClick={openInvite}
                  style={{
                    width: '100%',
                    minHeight: 44,
                    border: 0,
                    borderTop: people.length > 0 ? '1px solid var(--line)' : 0,
                    background: 'transparent',
                    color: 'var(--tx)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '0 12px',
                    textAlign: 'left',
                    font: 'inherit',
                    fontSize: 15,
                    fontWeight: 650,
                  }}
                >
                  <Plus size={16} strokeWidth={1.8} aria-hidden />
                  Invita nuovo collaboratore
                </button>
              </Card>
            )}
          </>
        )}
      </div>
      <Dialog open={inviteOpen} title="Invita" onClose={() => setInviteOpen(false)}>
        <form aria-label="Invita" noValidate onSubmit={(event) => { void send(event) }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, color: 'var(--tx2)', fontSize: 13, lineHeight: 1.4 }}>{frasi.proRuoloDettaglio}</p>
          <Input label="Email" type="email" value={email} error={error || undefined} onChange={(event) => setEmail(event.target.value)} />
          <RoleChoice value={inviteRole} onChange={setInviteRole} />
          <Button type="submit" size="sm" disabled={sending} aria-busy={sending || undefined} style={{ alignSelf: 'flex-end', minHeight: 32, padding: '0 14px' }}>Invia</Button>
          {notice ? <p style={{ margin: 0, ...USER_TEXT }}>{notice}</p> : null}
        </form>
      </Dialog>
    </ShellFrame>
  )
}
