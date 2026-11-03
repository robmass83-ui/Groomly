// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SalonMember } from '../../lib/salonRoster'
import { FiltroPersona } from './FiltroPersona'

const anna: SalonMember = { uid: 'a1', email: 'anna@s.it', role: 'collaboratore', firstName: 'Anna', lastName: 'Rossi', status: 'attivo' }
const teo: SalonMember = { uid: 't2', email: 'teo@s.it', role: 'socio', firstName: 'Teo', lastName: 'Bianchi', status: 'attivo' }

describe('FiltroPersona', () => {
  it('mostra Tutti e una voce per persona, segna la scelta e avvisa al tocco', async () => {
    const onCambia = vi.fn()
    const user = userEvent.setup()
    render(<FiltroPersona persone={[anna, teo]} valore="a1" onCambia={onCambia} />)
    const gruppo = screen.getByRole('group', { name: 'Filtra per persona' })
    expect(gruppo).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutti' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Anna Rossi' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Teo Bianchi' }))
    expect(onCambia).toHaveBeenCalledWith('t2')
    await user.click(screen.getByRole('button', { name: 'Tutti' }))
    expect(onCambia).toHaveBeenCalledWith(null)
  })
})
