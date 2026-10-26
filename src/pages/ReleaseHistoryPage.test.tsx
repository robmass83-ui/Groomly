// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../app/App'
import { createAccount } from '../data/local/auth'
import { APP_VERSION, RELEASE_REPO } from '../lib/appVersion'

function releasesPayload() {
  return [
    { tag_name: `v${APP_VERSION}`, published_at: '2026-10-04T00:00:00Z', body: 'Nota installata' },
    { tag_name: 'v1.0.0', published_at: '2026-10-01T00:00:00Z', body: '' },
  ]
}

describe('storico aggiornamenti', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete window.__GROOMLY_DISTRIBUTION__
  })

  it('si apre da impostazioni e mostra le release', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`repos/${RELEASE_REPO}/releases?per_page=100`)) {
        return Response.json(releasesPayload(), {
          headers: { Link: '<https://api.github.com/next>; rel="next"' },
        })
      }
      return new Response('no', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni" />)
    expect(await screen.findByRole('heading', { name: 'Impostazioni' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Groomly ${APP_VERSION}, storico aggiornamenti` })).toHaveTextContent(`Groomly ${APP_VERSION}`)
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Legale' }))
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'https://groomlyapp.it/privacy/?lang=it')
    expect(screen.getByRole('link', { name: 'Termini di servizio' })).toHaveAttribute('href', 'https://groomlyapp.it/termini/?lang=it')
    expect(screen.getByRole('link', { name: 'Trattamento dati' })).toHaveAttribute('href', 'https://groomlyapp.it/dpa/?lang=it')
    expect(screen.getByRole('link', { name: 'Come eliminare l’account' })).toHaveAttribute('href', 'https://groomlyapp.it/elimina-account/?lang=it')
    expect(screen.queryByText(/In Home, Da chiudere/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Indietro' }))
    await user.click(screen.getByRole('button', { name: `Groomly ${APP_VERSION}, storico aggiornamenti` }))
    expect(await screen.findByRole('heading', { name: 'Aggiornamenti' })).toBeInTheDocument()
    expect(screen.getByText(`Versione installata ${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByText('Installata')).toBeInTheDocument()
    expect(screen.getByText('Nota installata')).toBeInTheDocument()
    expect(screen.getByText('Nessuna nota per questa versione.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra le precedenti' })).toBeInTheDocument()
  })

  it('sulla variante play torna alle impostazioni, senza storico, e i link portano l’inglese', async () => {
    window.__GROOMLY_DISTRIBUTION__ = 'play'
    localStorage.setItem('groomly.lingua', 'en')
    await createAccount('maria@salone.it', 'segretissimo')
    render(<App memory isDev={false} initialPath="/impostazioni/aggiornamenti" />)
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Aggiornamenti' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /update history|storico aggiornamenti/i })).not.toBeInTheDocument()
    expect(screen.getByText(`Groomly ${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Privacy policy' })).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(screen.getByRole('link', { name: 'Legal' }))
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', 'https://groomlyapp.it/privacy/?lang=en')
    expect(screen.getByRole('link', { name: 'Terms of service' })).toHaveAttribute('href', 'https://groomlyapp.it/termini/?lang=en')
    expect(screen.getByRole('link', { name: 'Data processing' })).toHaveAttribute('href', 'https://groomlyapp.it/dpa/?lang=en')
    expect(screen.getByRole('link', { name: 'How to delete the account' })).toHaveAttribute('href', 'https://groomlyapp.it/elimina-account/?lang=en')
  })

  it('mostra errore se il fetch fallisce senza usare release.json', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`repos/${RELEASE_REPO}/releases?per_page=100`)) {
        return new Response('no', { status: 503 })
      }
      if (url.includes('releases/latest')) {
        return Response.json({
          tag_name: `v${APP_VERSION}`,
          assets: [{ name: 'groomly.apk', browser_download_url: 'https://github.com/apk' }],
        })
      }
      if (url.includes('release.json')) {
        return Response.json({ version: '8.8.8', url: 'https://groomly-3128b.web.app/groomly.apk' })
      }
      return new Response('no', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/aggiornamenti" />)
    expect(await screen.findByRole('heading', { name: 'Aggiornamenti' })).toBeInTheDocument()
    expect(screen.getByText(`Versione installata ${APP_VERSION}`)).toBeInTheDocument()
    expect(await screen.findByText('Lo storico non si carica')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Riprova' })).toBeInTheDocument()
    expect(screen.queryByText('Da latest')).not.toBeInTheDocument()
    expect(screen.queryByText('8.8.8')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining(`repos/${RELEASE_REPO}/releases?per_page=100`),
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('mostra caricamento prima della risposta', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    let resolveFetch!: (value: Response) => void
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`repos/${RELEASE_REPO}/releases?per_page=100`)) {
        return pending
      }
      return new Response('no', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchImpl)
    render(<App memory isDev={false} initialPath="/impostazioni/aggiornamenti" />)
    expect(await screen.findByRole('heading', { name: 'Aggiornamenti' })).toBeInTheDocument()
    expect(screen.getByText(`Versione installata ${APP_VERSION}`)).toBeInTheDocument()
    expect(screen.getByText('Caricamento…')).toBeInTheDocument()
    resolveFetch(Response.json(releasesPayload()))
    expect(await screen.findByText('Nota installata')).toBeInTheDocument()
    expect(screen.queryByText('Caricamento…')).not.toBeInTheDocument()
  })

  it('se il caricamento delle precedenti fallisce, mantiene la prima pagina', async () => {
    await createAccount('maria@salone.it', 'segretissimo')
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`repos/${RELEASE_REPO}/releases?per_page=100`)) {
        return Response.json(releasesPayload(), {
          headers: { Link: '<https://api.github.com/next>; rel="next"' },
        })
      }
      if (url.includes('https://api.github.com/next')) {
        throw new Error('network')
      }
      return new Response('no', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchImpl)
    const user = userEvent.setup()
    render(<App memory isDev={false} initialPath="/impostazioni/aggiornamenti" />)
    expect(await screen.findByText('Nota installata')).toBeInTheDocument()
    const loadMore = screen.getByRole('button', { name: 'Mostra le precedenti' })
    const rejections: unknown[] = []
    const onRejection = (event: PromiseRejectionEvent) => {
      rejections.push(event.reason)
    }
    window.addEventListener('unhandledrejection', onRejection)
    try {
      await user.click(loadMore)
      await vi.waitFor(() => {
        expect(loadMore).not.toBeDisabled()
      })
    } finally {
      window.removeEventListener('unhandledrejection', onRejection)
    }
    expect(rejections).toEqual([])
    expect(screen.getByText('Nota installata')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra le precedenti' })).toBeInTheDocument()
  })
})
