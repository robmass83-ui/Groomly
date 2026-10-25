import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalonAccess } from '../lib/salonRoster'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  push: null as null | ((access: SalonAccess) => void),
}))

vi.mock('../hooks/useSession', () => ({
  useSession: () => ({
    gate: {
      kind: 'in',
      account: { uid: 'c1', role: 'collaboratore', salonId: 's1', email: 'c@salone.it', firstName: 'Ciro', lastName: 'Zeta', legacy: false },
    },
    entry: { kind: 'home' },
    logout: mocks.logout,
  }),
}))

vi.mock('../hooks/useLocalData', () => ({
  useLocalData: () => false,
}))

vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({ settings: { business: { salonName: 'iPelosetti', name: '' } } }),
}))

vi.mock('../data/firebase/client', () => ({
  watchSalonAccess: async (_salonId: string, onChange: (access: SalonAccess) => void) => {
    mocks.push = onChange
    return () => undefined
  },
}))

import { StaffLock } from './AccessoSospeso'

const member = {
  uid: 'c1',
  email: 'c@salone.it',
  role: 'collaboratore' as const,
  firstName: 'Ciro',
  lastName: 'Zeta',
  status: 'attivo' as const,
}

describe('accesso sospeso in app', () => {
  beforeEach(() => {
    mocks.logout.mockReset()
    mocks.push = null
  })

  it('con il piano spento spiega e fa uscire', async () => {
    const user = userEvent.setup()
    render(<StaffLock><p>Agenda</p></StaffLock>)
    await vi.waitFor(() => expect(mocks.push).toBeTypeOf('function'))
    mocks.push?.({ enabled: false, members: [member], openInviteExpiries: [] })
    expect(await screen.findByText('Il tuo accesso a iPelosetti è sospeso')).toBeInTheDocument()
    expect(screen.queryByText('Agenda')).not.toBeInTheDocument()
    expect(screen.getByText('Il titolare ha spento il piano. I dati non sono persi.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Esci' }))
    expect(mocks.logout).toHaveBeenCalledOnce()
  })
})
