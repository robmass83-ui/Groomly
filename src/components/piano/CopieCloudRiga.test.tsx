import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CopieCloudRiga } from './CopieCloudRiga'
import { statoPiano } from '../../lib/piano'

const ora = new Date('2026-10-25T12:00:00.000Z')
const base = statoPiano(undefined, ora)
const pro = statoPiano({ piano: 'pro', stato: 'attivo', fonte: 'manuale' }, ora)

describe('riga copie cloud', () => {
  it('con il flag spento non aggiunge nulla al foglio', () => {
    const { container } = render(<CopieCloudRiga mostraPiani={false} stato={base} bucket={null} onPaywall={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('in base il tocco apre la paywall e non elenca copie', async () => {
    const onPaywall = vi.fn()
    const user = userEvent.setup()
    render(<CopieCloudRiga mostraPiani stato={base} bucket={null} onPaywall={onPaywall} />)
    await user.click(screen.getByRole('button', { name: /Copie delle foto/ }))
    expect(onPaywall).toHaveBeenCalledOnce()
    expect(screen.queryByText('Copie non disponibili')).not.toBeInTheDocument()
  })

  it('in Pro senza bucket dice che le copie non sono disponibili', () => {
    render(<CopieCloudRiga mostraPiani stato={pro} bucket={null} onPaywall={() => undefined} />)
    expect(screen.getByText('Copie non disponibili')).toBeInTheDocument()
  })
})
