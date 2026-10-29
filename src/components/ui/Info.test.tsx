// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { Info } from './Info'

function renderInfo() {
  return render(
    <LinguaProvider>
      <Info nome="Promemoria" titolo="Promemoria" testo="Manda da solo un promemoria." />
    </LinguaProvider>,
  )
}

describe('Info', () => {
  it('apre il dialogo con titolo e testo', async () => {
    const user = userEvent.setup()
    renderInfo()
    await user.click(screen.getByRole('button', { name: 'Informazioni su Promemoria' }))
    expect(screen.getByRole('dialog', { name: 'Promemoria' })).toBeInTheDocument()
    expect(screen.getByText('Manda da solo un promemoria.')).toBeInTheDocument()
  })

  it('tiene l’icona dentro il bottone', () => {
    renderInfo()
    const bottone = screen.getByRole('button', { name: 'Informazioni su Promemoria' })
    expect(bottone.querySelector('svg')).not.toBeNull()
  })
})
