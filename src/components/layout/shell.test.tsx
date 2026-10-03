import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SERVICE_ICONS, TEMPERAMENT_ICONS } from '../../assets/icons/icons'
import { SERVICE_ICON_KEYS } from '../../types/models'
import { DogAvatar } from '../domain/DogAvatar'
import { ServiceIcon } from '../domain/ServiceIcon'
import { TemperamentIcon } from '../domain/TemperamentIcon'
import { PhoneShell } from './PhoneShell'
import { Sheet } from './Sheet'
import { ToastProvider, useToast } from './Toast'

function ToastProbe() {
  const toast = useToast()
  return <button type="button" onClick={() => toast.show('Salvato', 'ok')}>Mostra</button>
}

describe('shell', () => {
  it('limita la colonna a 390 px e mostra la barra', () => {
    render(
      <MemoryRouter>
        <PhoneShell showNav>
          <p>Oggi</p>
        </PhoneShell>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('phone-shell')).toHaveStyle({ maxWidth: '390px' })
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Animali' })).toHaveAttribute('href', '/animali')
    expect(screen.getByRole('button', { name: 'Apri azioni' })).toBeInTheDocument()
  })

  it('apre il foglio e il toast Salvato', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Sheet open title="Prova" onClose={() => undefined}><p>Contenuto</p></Sheet>
        <ToastProbe />
      </ToastProvider>,
    )
    expect(screen.getByRole('dialog', { name: 'Prova' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mostra' }))
    expect(screen.getByRole('status')).toHaveTextContent('Salvato')
  })

  it('usa le icone del kit e le forbici se manca la chiave', () => {
    expect(Object.keys(SERVICE_ICONS).sort()).toEqual([...SERVICE_ICON_KEYS].sort())
    render(
      <div>
        <TemperamentIcon kind="bravo" size={18} />
        <ServiceIcon iconKey="bagno" size={19} />
        <ServiceIcon size={19} />
        <DogAvatar alt="Foto mancante" size="md" />
      </div>,
    )
    expect(screen.getByRole('img', { name: 'Bravo' })).toHaveAttribute('src', TEMPERAMENT_ICONS.bravo.src)
    expect(screen.getByRole('img', { name: 'Bagno' })).toBeInTheDocument()
    expect(screen.getByTestId('service-fallback')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto mancante' })).toBeInTheDocument()
  })
})
