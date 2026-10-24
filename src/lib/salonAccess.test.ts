import { describe, expect, it } from 'vitest'
import {
  acceptInviteDecision,
  assigneeOf,
  changeRoleDecision,
  createInviteDecision,
  inviteExpiresAt,
  inviteLink,
  revokeDecision,
  roleLabel,
  setProDecision,
  showAssigneePicker,
  usedSeats,
  visibleAppointments,
} from './salonAccess'

const now = new Date('2026-10-24T12:00:00.000Z')

describe('salonAccess', () => {
  it('conta soci e collaboratori attivi e gli inviti aperti non scaduti', () => {
    expect(usedSeats(
      [
        { role: 'titolare', status: 'attivo' },
        { role: 'socio', status: 'attivo' },
        { role: 'collaboratore', status: 'revocato' },
      ],
      [
        { status: 'aperto', expiresAt: '2026-10-25T00:00:00.000Z' },
        { status: 'aperto', expiresAt: '2026-10-23T00:00:00.000Z' },
        { status: 'usato', expiresAt: '2026-10-30T00:00:00.000Z' },
      ],
      now,
    )).toBe(2)
    expect(inviteExpiresAt(now).toISOString()).toBe('2026-10-31T12:00:00.000Z')
  })

  it('mostra Chi lo fa solo con Pro e almeno un altro attivo', () => {
    expect(showAssigneePicker(false, [{ role: 'collaboratore', status: 'attivo' }])).toBe(false)
    expect(showAssigneePicker(true, [{ role: 'titolare', status: 'attivo' }])).toBe(false)
    expect(showAssigneePicker(true, [{ role: 'socio', status: 'attivo' }])).toBe(true)
  })

  it('senza persona l’appuntamento è del titolare e il collaboratore vede solo i suoi', () => {
    expect(assigneeOf({}, 'owner')).toBe('owner')
    expect(assigneeOf({ assigneeUid: 'c1' }, 'owner')).toBe('c1')
    const items = [{ id: 'a', assigneeUid: 'c1' }, { id: 'b' }, { id: 'c', assigneeUid: 'owner' }]
    expect(visibleAppointments(items, { uid: 'c1', ownerUid: 'owner', role: 'collaboratore' }).map((item) => item.id)).toEqual(['a'])
    expect(visibleAppointments(items, { uid: 'owner', ownerUid: 'owner', role: 'titolare' })).toHaveLength(3)
    expect(visibleAppointments(items, { uid: 's1', ownerUid: 'owner', role: 'socio' })).toHaveLength(3)
  })

  it('l’operatore accende Pro anche sul salone di Laura, gli altri no', () => {
    expect(setProDecision({ operator: false }, 'salon-1')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(setProDecision({ operator: false }, 'shared')).toEqual({ ok: false, message: 'Accesso negato' })
    expect(setProDecision({ operator: true }, 'shared')).toEqual({ ok: true })
    expect(setProDecision({ operator: true }, 'salon-1')).toEqual({ ok: true })
  })

  it('crea un invito solo con posto, email nuova e ruolo ammesso', () => {
    const caller = { uid: 'owner', email: 'ada@salone.it', salonId: 'owner', role: 'titolare' as const, operator: false }
    const members = [{ email: 'gia@salone.it', role: 'collaboratore' as const, status: 'attivo' as const }]
    expect(createInviteDecision({ caller, proEnabled: false, email: 'nuova@salone.it', role: 'collaboratore', members, invites: [], now }).message).toBe('Pro non è attivo')
    expect(createInviteDecision({ caller: { ...caller, role: 'collaboratore' }, proEnabled: true, email: 'nuova@salone.it', role: 'socio', members, invites: [], now }).message).toBe('Accesso negato')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'no', role: 'socio', members, invites: [], now }).message).toBe('Inserisci un’email valida')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'nuova@salone.it', role: 'titolare', members, invites: [], now }).message).toBe('Accesso negato')
    const full = [0, 1, 2].map(() => ({ status: 'aperto' as const, expiresAt: '2026-10-30T00:00:00.000Z' }))
    expect(createInviteDecision({ caller, proEnabled: true, email: 'nuova@salone.it', role: 'socio', members: [], invites: full, now }).message).toBe('Posti esauriti')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'gia@salone.it', role: 'socio', members, invites: [], now }).message).toBe('Questa email è già nel salone')
    expect(createInviteDecision({ caller, proEnabled: true, email: 'laura.masala@tiscali.it', role: 'socio', members: [], invites: [], now }).message).toBe('Questa email è già nel salone')
    expect(createInviteDecision({
      caller: { salonId: 'shared', role: 'titolare' },
      proEnabled: true,
      email: 'nuova@salone.it',
      role: 'collaboratore',
      members: [],
      invites: [],
      now,
    })).toMatchObject({ ok: true, email: 'nuova@salone.it', role: 'collaboratore' })
    const ok = createInviteDecision({ caller, proEnabled: true, email: ' Nuova@Salone.it ', role: 'collaboratore', members, invites: [], now })
    expect(ok).toMatchObject({ ok: true, email: 'nuova@salone.it', role: 'collaboratore' })
    expect(roleLabel('socio')).toBe('Socio')
    expect(inviteLink('abc')).toBe('https://groomly-3128b.web.app/invito/abc')
  })

  it('accetta solo un invito aperto, in tempo, sull’email giusta, da un salone vuoto', () => {
    const invite = { status: 'aperto' as const, expiresAt: '2026-10-25T00:00:00.000Z', email: 'nuova@salone.it', salonId: 'owner', role: 'collaboratore' as const }
    const account = { uid: 'new', salonId: 'new', role: 'titolare' as const }
    expect(acceptInviteDecision({ invite: null, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite: { ...invite, expiresAt: '2026-10-23T00:00:00.000Z' }, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito scaduto')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'altra@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: false, activeOthers: 0, personalSalonHasData: false }).message).toBe('Invito non valido')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account: { ...account, salonId: 'altro' }, proEnabled: true, activeOthers: 0, personalSalonHasData: false }).message).toBe('Questo account ha già un salone')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 0, personalSalonHasData: true }).message).toBe('Questo account ha già un salone')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 3, personalSalonHasData: false }).message).toBe('Posti esauriti')
    expect(acceptInviteDecision({ invite, now, accountEmail: 'nuova@salone.it', account, proEnabled: true, activeOthers: 2, personalSalonHasData: false })).toEqual({ ok: true, salonId: 'owner', role: 'collaboratore' })
    expect(acceptInviteDecision({
      invite: { ...invite, salonId: 'shared' },
      now,
      accountEmail: 'nuova@salone.it',
      account,
      proEnabled: true,
      activeOthers: 0,
      personalSalonHasData: false,
    })).toEqual({ ok: true, salonId: 'shared', role: 'collaboratore' })
  })

  it('non revoca il titolare e cambia solo fra socio e collaboratore', () => {
    const caller = { uid: 'owner', email: 'ada@salone.it', salonId: 'owner', role: 'titolare' as const, operator: false }
    expect(revokeDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'owner', targetRole: 'titolare' }).message).toBe('Non puoi revocare il titolare')
    expect(revokeDecision({ caller: { ...caller, role: 'collaboratore' }, proEnabled: true, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' }).message).toBe('Accesso negato')
    expect(revokeDecision({ caller, proEnabled: false, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' }).message).toBe('Accesso negato')
    expect(revokeDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'c1', targetRole: 'collaboratore' })).toEqual({ ok: true })
    expect(changeRoleDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'owner', nextRole: 'socio' }).message).toBe('Accesso negato')
    expect(changeRoleDecision({ caller, proEnabled: true, salonId: 'owner', targetUid: 'c1', nextRole: 'collaboratore' })).toEqual({ ok: true, role: 'collaboratore' })
  })
})
