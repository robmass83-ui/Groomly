import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { Button } from '../components/ui/Button'
import { AttesaZampe } from '../components/ui/Zampette'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Toggle } from '../components/ui/Toggle'
import { ConfermaRevoca } from '../components/team/ConfermaRevoca'
import { ConfermaRuolo } from '../components/team/ConfermaRuolo'
import { messaggioCallable } from '../components/team/messaggioCallable'
import { useSession } from '../hooks/useSession'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { PRO_SEAT_LIMIT, createInviteDecision, roleLabel, usedSeats } from '../lib/salonAccess'
import { SHARED_SALON_ID, isOperator, isSharedEmail, type AccountRole } from '../lib/salonPath'
import { rosterLabel, type SalonAccess, type SalonMember } from '../lib/salonRoster'
import { SIZES } from '../theme/sizes'
import { USER_TEXT } from '../theme/text'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

type InviteRole = 'socio' | 'collaboratore'
type PendingInvite = { id: string; email: string; ruolo: InviteRole; scade: string }

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
  const { lingua } = useLingua()
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
  const [sending, setSending] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState('')
  const [pending, setPending] = useState<PendingInvite[]>([])
  const [toRevoke, setToRevoke] = useState<SalonMember | null>(null)
  const [toChangeRole, setToChangeRole] = useState<SalonMember | null>(null)
  const [toCancel, setToCancel] = useState<PendingInvite | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const inactive = seen && !access.enabled
  const canManage = callerRole !== 'collaboratore'
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

  async function loadPending() {
    try {
      const mod = await import('../data/firebase/client')
      setPending(await mod.callInvitiInSospeso())
    } catch {
      setPending([])
    }
  }

  useEffect(() => {
    if (!seen || inactive || !canManage || salonId === '') return
    void loadPending()
  }, [seen, inactive, canManage, salonId])

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
      void loadPending()
    } catch (caught) {
      setError(messaggioCallable(caught, frasi.invitoInvio, frasi.impInvioRiprova))
    } finally {
      setSending(false)
    }
  }

  async function cancelInvite() {
    if (!toCancel || cancelling) return
    setCancelError('')
    setCancelling(true)
    try {
      const mod = await import('../data/firebase/client')
      await mod.callAnnullaInvito(toCancel.id)
    } catch (caught) {
      setCancelError(messaggioCallable(caught, frasi.invitoInvio, frasi.impInvioRiprova))
      setCancelling(false)
      return
    }
    setCancelling(false)
    setToCancel(null)
    await loadPending()
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
                  <span style={{ display: 'block', fontWeight: 700, ...USER_TEXT }}>{frasi.proPianoSalone}</span>
                  <span style={{ display: 'block', color: 'var(--tx2)', fontSize: TYPE.meta }}>
                    <span style={{ color: access.enabled ? 'var(--ok)' : 'var(--tx2)', fontWeight: 700 }}>{access.enabled ? frasi.servAttivo : frasi.proNonAttivo}</span>
                    {access.enabled ? <> · <span>{seats} di {access.seats ?? PRO_SEAT_LIMIT} posti</span></> : null}
                  </span>
                </span>
                {operator ? (
                  <Toggle checked={access.enabled} disabled={switching} label={frasi.proPianoSalone} onChange={() => { void togglePro() }} />
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
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 2, minHeight: 28 }}>
                        <span style={{ fontWeight: 700, whiteSpace: 'nowrap', ...USER_TEXT }}>{label}</span>
                        {staff ? <span style={chip}>{personRole(member.role, frasi.impTitolare)}</span> : null}
                        {staff && member.uid !== account?.uid ? (
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                            {canManage ? (
                              <button
                                type="button"
                                aria-label={t(lingua, member.role === 'socio' ? 'teamRendiCollaboratoreA' : 'teamRendiSocioA', { nome: label })}
                                onClick={() => setToChangeRole(member)}
                                style={{ height: 26, padding: 0, border: 0, background: 'transparent', color: 'var(--pri)', font: 'inherit', fontSize: 12, fontWeight: 650, whiteSpace: 'nowrap' }}
                              >
                                {member.role === 'socio' ? frasi.teamRendiCollaboratore : frasi.teamRendiSocio}
                              </button>
                            ) : null}
                            <button type="button" aria-label={t(lingua, 'teamTogliA', { nome: label })} onClick={() => setToRevoke(member)} style={{ height: 26, padding: 0, border: 0, background: 'transparent', color: 'var(--bad)', font: 'inherit', fontSize: 12, fontWeight: 650 }}>
                              {frasi.teamTogli}
                            </button>
                          </span>
                        ) : null}
                      </div>
                      <span style={{ display: 'block', marginTop: 1, color: 'var(--tx2)', fontSize: 13, overflowWrap: 'anywhere' }}>
                        {staff ? (label === member.email ? '' : member.email) : `${frasi.impTitolare}${label === member.email ? '' : ` · ${member.email}`}`}
                      </span>
                    </div>
                  )
                })}
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
            {inactive || !canManage || pending.length === 0 ? null : (
              <Card>
                <h2 style={{ margin: 0, padding: '8px 12px 0', fontSize: 13, fontWeight: 700, color: 'var(--tx2)' }}>{frasi.teamInvitiSospeso}</h2>
                {pending.map((invite, index) => (
                  <div key={invite.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 9px', borderTop: index === 0 ? 'none' : '1px solid var(--line)' }}>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 700, overflowWrap: 'anywhere', ...USER_TEXT }}>{invite.email}</span>
                      <span style={{ display: 'block', color: 'var(--tx2)', fontSize: 13 }}>
                        {frasi.teamInvitoScade.replace('{{ruolo}}', roleLabel(invite.ruolo)).replace('{{data}}', new Date(invite.scade).toLocaleDateString(lingua))}
                      </span>
                    </span>
                    <button type="button" aria-label={t(lingua, 'teamAnnullaInvitoA', { email: invite.email })} onClick={() => { setCancelError(''); setToCancel(invite) }} style={{ height: 26, padding: 0, border: 0, background: 'transparent', color: 'var(--bad)', font: 'inherit', fontSize: 12, fontWeight: 650 }}>
                      {frasi.teamAnnullaInvito}
                    </button>
                  </div>
                ))}
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
          <AttesaZampe testo={sending ? frasi.authInvio : null} />
        </form>
      </Dialog>
      <ConfermaRevoca membro={toRevoke} onChiudi={() => setToRevoke(null)} />
      <ConfermaRuolo membro={toChangeRole} onChiudi={() => setToChangeRole(null)} />
      <Dialog open={toCancel !== null} title={frasi.teamAnnullaConferma} onClose={() => setToCancel(null)}>
        <p style={{ margin: 0, ...USER_TEXT }}>{toCancel ? frasi.teamAnnullaDomanda.replace('{{email}}', toCancel.email) : ''}</p>
        {cancelError ? <p role="alert" style={{ margin: 0, color: 'var(--bad)', ...USER_TEXT }}>{cancelError}</p> : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="button" size="sm" variant="secondary" disabled={cancelling} onClick={() => setToCancel(null)}>{frasi.invitoAnnulla}</Button>
          <Button type="button" size="sm" variant="bad" disabled={cancelling} aria-busy={cancelling || undefined} onClick={() => { void cancelInvite() }}>{frasi.teamAnnullaConferma}</Button>
        </div>
      </Dialog>
    </ShellFrame>
  )
}
