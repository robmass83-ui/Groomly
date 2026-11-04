// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonAccess, SalonMember } from '../../lib/salonRoster'
import { PersoneCollegate } from './PersoneCollegate'

const client = vi.hoisted(() => ({
  push: null as null | ((access: SalonAccess) => void),
  revoke: vi.fn(async (_uid: string) => undefined),
}))
vi.mock('../../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: SalonAccess) => void) => {
    client.push = onChange
    return () => undefined
  },
  callRevokeMember: (uid: string) => client.revoke(uid),
}))

const titolare: SalonMember = { uid: 't1', email: 't@salone.it', role: 'titolare', firstName: 'Tina', lastName: 'Verdi', status: 'attivo' }
const anna: SalonMember = { uid: 'a1', email: 'anna@salone.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' }

async function monta(access: SalonAccess) {
  render(<PersoneCollegate salonId="t1" />)
  await vi.waitFor(() => expect(client.push).toBeTypeOf('function'))
  client.push?.(access)
}

describe('PersoneCollegate', () => {
  beforeEach(() => {
    client.push = null
    client.revoke.mockReset().mockResolvedValue(undefined)
  })

  it('con un collaboratore attivo mostra titolo, nome e Togli; Togli chiede conferma e revoca', async () => {
    const user = userEvent.setup()
    await monta({ enabled: false, members: [titolare, anna], openInviteExpiries: [] })
    expect(await screen.findByText('Persone ancora collegate al tuo salone')).toBeInTheDocument()
    expect(screen.getByText('Il piano Salon non è attivo: queste persone non possono entrare. Toglile per liberare il loro account.')).toBeInTheDocument()
    expect(screen.getByText('Anna Rossi')).toBeInTheDocument()
    expect(screen.queryByText('Tina Verdi')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Togli Anna Rossi' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Togli' }))
    expect(client.revoke).toHaveBeenCalledWith('a1')
  })

  it('senza membri staff attivi non mostra nulla', async () => {
    await monta({ enabled: false, members: [titolare, { ...anna, status: 'revocato' }], openInviteExpiries: [] })
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText('Persone ancora collegate al tuo salone')).not.toBeInTheDocument()
  })

  it('con elenco negato non mostra nulla', async () => {
    await monta({ enabled: false, members: [anna], elencoNegato: true, openInviteExpiries: [] })
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.queryByText('Persone ancora collegate al tuo salone')).not.toBeInTheDocument()
  })
})
