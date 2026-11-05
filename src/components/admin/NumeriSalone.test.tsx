// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { NumeriSalone } from './NumeriSalone'

vi.mock('../../hooks/useSettings', () => ({ useSettings: () => ({ theme: 'light' }) }))

describe('NumeriSalone', () => {
  it('mostra i numeri aggregati', async () => {
    render(<LinguaProvider><NumeriSalone carica={async () => ({ cani: 12, appuntamenti: 80, appuntamenti30: 9, persone: 2, versioneApp: '1.1.192', lingua: 'de' })} /></LinguaProvider>)
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('1.1.192')).toBeInTheDocument()
    expect(screen.getByText('Deutsch')).toBeInTheDocument()
  })

  it('se la chiamata fallisce resta un trattino, senza errori', async () => {
    render(<LinguaProvider><NumeriSalone carica={async () => { throw new Error('no') }} /></LinguaProvider>)
    expect(await screen.findAllByText('—')).toHaveLength(6)
  })
})
