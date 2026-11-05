// @vitest-environment happy-dom
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { App } from '../../app/App'
import { createAccount } from '../../data/local/auth'
import { getSettings } from '../../data/local/settings'
import { storageKeys, writeJson } from '../../data/local/storage'
import { LinguaProvider } from '../../i18n/LinguaContext'
import { BrandBar } from './BrandBar'
import { ProfiloContext } from './ProfiloTestata'

function testata(path: string, avviso = false) {
  return render(
    <LinguaProvider>
      <MemoryRouter initialEntries={[path]}>
        <ProfiloContext.Provider value={{ avviso }}><BrandBar /></ProfiloContext.Provider>
      </MemoryRouter>
    </LinguaProvider>,
  )
}

async function entra(role?: string) {
  const account = await createAccount('maria@salone.it', 'segretissimo')
  if (role) writeJson(storageKeys.auth, { ...account, role, salonId: 'titolare-uid' })
  return account
}

describe('icona del profilo in testata', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('apre le Impostazioni e fuori dalle pagine con la barra non c’è', () => {
    const view = testata('/')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('href', '/impostazioni')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).not.toHaveAttribute('aria-current')
    view.unmount()
    render(<MemoryRouter><BrandBar /></MemoryRouter>)
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('resta attiva nelle Impostazioni e nelle sottopagine', () => {
    const view = testata('/impostazioni')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('aria-current', 'page')
    view.unmount()
    testata('/impostazioni/servizi')
    expect(screen.getByRole('link', { name: 'Impostazioni' })).toHaveAttribute('aria-current', 'page')
  })

  it('il bollino fiscale sta dentro il link e il nome lo dice', () => {
    testata('/', true)
    const link = screen.getByRole('link', { name: 'Impostazioni, dati da completare' })
    expect(within(link).getByTestId('tax-dot')).toBeInTheDocument()
  })

  it('in Home il link non sta dentro il titolo', async () => {
    await entra()
    render(<App memory isDev={false} initialPath="/" />)
    const link = await screen.findByRole('link', { name: /Impostazioni/ })
    expect(link.closest('h1')).toBeNull()
  })

  it('il titolare con i dati mancanti vede il bollino', async () => {
    await entra()
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByTestId('tax-dot')).toBeInTheDocument()
  })

  it('il collaboratore non vede il bollino, che non potrebbe togliere', async () => {
    await entra('collaboratore')
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('link', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByTestId('tax-dot')).toBeNull()
  })

  it('con i dati fiscali salvati il bollino non c’è', async () => {
    const account = await entra()
    const settings = getSettings(account.uid)
    writeJson(storageKeys.settings(account.uid), { ...settings, business: { ...settings.business, taxCode: 'RSSMRA85T10A562S' } })
    render(<App memory isDev={false} initialPath="/mensili" />)
    expect(await screen.findByRole('link', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.queryByTestId('tax-dot')).toBeNull()
  })
})
