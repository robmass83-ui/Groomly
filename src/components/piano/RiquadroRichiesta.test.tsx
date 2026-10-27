import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RichiestaNuova } from '../../data/firebase/client'
import { RigaRichieste } from './RigaRichieste'
import { RiquadroRichiesta, type CaneRichiesta, type VisitaRichiesta } from './RiquadroRichiesta'

const chiamate = vi.hoisted(() => ({
  gestisci: vi.fn(),
  posti: vi.fn(),
}))

vi.mock('../../data/firebase/client', () => ({
  callGestisciPrenotazione: chiamate.gestisci,
  callPostiLiberi: chiamate.posti,
}))

const FOTO = 'data:image/png;base64,iVBORw0KGgo='

function richiesta(extra: Partial<RichiestaNuova> = {}): RichiestaNuova {
  return {
    id: 'r1',
    nome: 'Mario Rossi',
    cane: 'Rex',
    specie: 'cane',
    razza: 'Meticcio',
    taglia: 'media',
    phone: '+39 333 1234567',
    email: 'Mario@Posta.it',
    foto: [FOTO],
    start: '2026-10-28T17:00:00+01:00',
    end: '2026-10-28T18:00:00+01:00',
    ...extra,
  }
}

function cane(id: string, name: string, status: CaneRichiesta['status'], phone = '3331234567'): CaneRichiesta {
  return { id, name, breed: '', status, contact: { name: 'Mario Rossi', phone } }
}

const SERVIZIO = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 60, price: 20 }]

function visita(extra: Partial<VisitaRichiesta> = {}): VisitaRichiesta {
  return { start: new Date('2026-10-28T17:00:00+01:00'), services: SERVIZIO, status: 'programmato', ...extra }
}

function apri(props: { cani?: CaneRichiesta[]; visite?: VisitaRichiesta[]; onFatto?: () => void; onChiudi?: () => void; richiesta?: RichiestaNuova } = {}) {
  return render(
    <RiquadroRichiesta
      aperta
      richiesta={props.richiesta ?? richiesta()}
      cani={props.cani ?? []}
      visite={props.visite ?? []}
      onChiudi={props.onChiudi ?? (() => undefined)}
      onFatto={props.onFatto ?? (() => undefined)}
    />,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  // Solo la data è finta: le 09:00 di Roma del 28 ottobre, prima dell'ora chiesta nelle richieste di prova.
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-28T08:00:00Z') })
  chiamate.gestisci.mockReset()
  chiamate.posti.mockReset()
  chiamate.gestisci.mockResolvedValue({ ok: true })
  chiamate.posti.mockResolvedValue({ '2026-10-29': ['09:00', '10:00'], '2026-10-30': ['11:00'] })
})

describe('riquadro richiesta', () => {
  it('senza scelta Accetta e Proponi sono spenti, Rifiuta no', () => {
    render(<RiquadroRichiesta aperta richiesta={richiesta()} cani={[]} visite={[]} onChiudi={() => undefined} onFatto={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Proponi un altro orario' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeEnabled()
  })

  it('è un dialogo modale che si chiude con la X e con Escape', async () => {
    const onChiudi = vi.fn()
    const user = userEvent.setup()
    apri({ onChiudi })
    const dialogo = screen.getByRole('dialog', { name: 'Richiesta' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveTextContent('Mario Rossi chiede un appuntamento per Rex')
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    await user.keyboard('{Escape}')
    expect(onChiudi).toHaveBeenCalledTimes(2)
  })

  it('le foto da 56 pixel stanno solo qui', () => {
    apri()
    const foto = screen.getByRole('dialog').querySelector('img')
    expect(foto).not.toBeNull()
    expect(foto).toHaveAttribute('width', '56')
    expect(foto).toHaveAttribute('height', '56')
  })

  it('offre Nuovo profilo e i candidati, con Archivio per chi non è in cura, senza i deceduti', () => {
    apri({
      cani: [
        cane('a', 'Attivo', 'attivo'),
        cane('b', 'Vecchio', 'non_in_cura'),
        cane('c', 'Defunto', 'deceduto'),
        cane('d', 'Altrui', 'attivo', '3999999999'),
      ],
    })
    const radio = screen.getAllByRole('radio').map((voce) => voce.closest('label')?.textContent)
    expect(radio).toEqual(['Nuovo profilo', 'Attivo', 'Vecchio · Archivio'])
    expect(screen.queryByText(/Defunto/)).toBeNull()
    expect(screen.queryByText(/Altrui/)).toBeNull()
  })

  it('con una scelta Accetta e Proponi si accendono', async () => {
    const user = userEvent.setup()
    apri()
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Proponi un altro orario' })).toBeEnabled()
  })

  it('Accetta manda azione accetta e scelta, poi chiama onFatto', async () => {
    const onFatto = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto, cani: [cane('rex-id', 'Rex', 'attivo')] })
    await user.click(screen.getByRole('radio', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Accetta' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledOnce())
    expect(chiamate.gestisci).toHaveBeenCalledWith({ id: 'r1', azione: 'accetta', scelta: 'rex-id' })
  })

  it('Rifiuta funziona senza scelta', async () => {
    const onFatto = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto })
    await user.click(screen.getByRole('button', { name: 'Rifiuta' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledOnce())
    expect(chiamate.gestisci).toHaveBeenCalledWith({ id: 'r1', azione: 'rifiuta', scelta: '' })
  })

  it('una visita definitiva sulla stessa ora lo dice e lascia Accetta acceso', async () => {
    const user = userEvent.setup()
    apri({ visite: [visita()] })
    expect(screen.getByText('A quest’ora c’è già una visita.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeEnabled()
  })

  it('con l’orario già passato Accetta resta spento anche con la scelta fatta, e Rifiuta no', async () => {
    const user = userEvent.setup()
    apri({ richiesta: richiesta({ start: '2026-10-28T08:00:00+01:00', end: '2026-10-28T09:00:00+01:00' }) })
    expect(screen.getByText('L’orario chiesto è già passato.')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Proponi un altro orario' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeEnabled()
  })

  it('con l’orario futuro la frase del passato non compare', () => {
    apri()
    expect(screen.queryByText('L’orario chiesto è già passato.')).toBeNull()
  })

  it('una visita provvisoria, conclusa, di un altro orario o di un altro giorno non conta', () => {
    apri({
      visite: [
        visita({ provvisorio: true }),
        visita({ status: 'disdetto' }),
        visita({ start: new Date('2026-10-28T18:00:00+01:00') }),
        visita({ start: new Date('2026-10-29T17:00:00+01:00') }),
      ],
    })
    expect(screen.queryByText('A quest’ora c’è già una visita.')).toBeNull()
  })

  it('se la mail non parte il riquadro resta aperto e lo dice', async () => {
    chiamate.gestisci.mockResolvedValue({ ok: false, errore: 'email' })
    const onFatto = vi.fn()
    const onChiudi = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto, onChiudi })
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    await user.click(screen.getByRole('button', { name: 'Proponi un altro orario' }))
    await user.click(await screen.findByRole('button', { name: '09:00' }))
    await user.click(screen.getByRole('button', { name: 'Proponi un altro orario' }))
    expect(await screen.findByText('Email non inviata')).toBeInTheDocument()
    expect(onFatto).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('Accetta riuscita ma con la mail non partita resta aperto, lo dice e non chiama onFatto', async () => {
    chiamate.gestisci.mockResolvedValue({ ok: true, emailStato: 'non_inviata' })
    const onFatto = vi.fn()
    const onChiudi = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto, onChiudi })
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    await user.click(screen.getByRole('button', { name: 'Accetta' }))
    expect(await screen.findByText('Email non inviata')).toBeInTheDocument()
    expect(onFatto).not.toHaveBeenCalled()
    expect(onChiudi).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Accetta' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeDisabled()
    await user.keyboard('{Escape}')
    expect(onChiudi).toHaveBeenCalledOnce()
  })

  it('Accetta con la mail partita chiude come prima', async () => {
    chiamate.gestisci.mockResolvedValue({ ok: true, emailStato: 'inviata' })
    const onFatto = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto })
    await user.click(screen.getByRole('radio', { name: 'Nuovo profilo' }))
    await user.click(screen.getByRole('button', { name: 'Accetta' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledOnce())
    expect(screen.queryByText('Email non inviata')).toBeNull()
  })

  it('Proponi cambia il blocco orario nello stesso riquadro e manda giorno e ora', async () => {
    const onFatto = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto, cani: [cane('rex-id', 'Rex', 'attivo')] })
    await user.click(screen.getByRole('radio', { name: 'Rex' }))
    await user.click(screen.getByRole('button', { name: 'Proponi un altro orario' }))
    expect(chiamate.posti).toHaveBeenCalledOnce()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    const ore = await screen.findByRole('group', { name: 'Orario' })
    expect(within(ore).getAllByRole('button').map((voce) => voce.textContent)).toEqual(['09:00', '10:00'])
    expect(screen.getByRole('button', { name: 'Proponi un altro orario' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /30 ott/ }))
    expect(within(screen.getByRole('group', { name: 'Orario' })).getAllByRole('button').map((voce) => voce.textContent)).toEqual(['11:00'])
    await user.click(screen.getByRole('button', { name: '11:00' }))
    await user.click(screen.getByRole('button', { name: 'Proponi un altro orario' }))
    await waitFor(() => expect(onFatto).toHaveBeenCalledOnce())
    expect(chiamate.gestisci).toHaveBeenCalledWith({ id: 'r1', azione: 'proponi', scelta: 'rex-id', giorno: '2026-10-30', ora: '11:00' })
  })

  it('un errore diverso dalla mail lascia aperto il riquadro con il messaggio di salvataggio', async () => {
    chiamate.gestisci.mockRejectedValue(new Error('rete'))
    const onFatto = vi.fn()
    const user = userEvent.setup()
    apri({ onFatto })
    await user.click(screen.getByRole('button', { name: 'Rifiuta' }))
    expect(await screen.findByText('Salvataggio non riuscito')).toBeInTheDocument()
    expect(onFatto).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Rifiuta' })).toBeEnabled()
  })
})

describe('riga richieste', () => {
  it('la riga non mostra la foto', () => {
    const { container } = render(<RigaRichieste richieste={[richiesta()]} onApri={() => undefined} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).toHaveTextContent('17:00')
    expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).toHaveTextContent('Cane')
    expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).not.toHaveTextContent('foto')
  })

  it('il giorno e l’ora sono quelli di Roma', () => {
    render(<RigaRichieste richieste={[richiesta({ start: '2026-10-28T22:30:00Z' })]} onApri={() => undefined} />)
    expect(screen.getByRole('button', { name: /Mario chiede per Rex/ })).toHaveTextContent('mer 28 ott · 23:30 · Cane')
    expect(screen.getByRole('button', { name: /Mario chiede per Rex/ }).querySelector('svg')).not.toBeNull()
  })

  it('senza nome dell’animale dice l’animale', () => {
    render(<RigaRichieste richieste={[richiesta({ cane: ' ' })]} onApri={() => undefined} />)
    expect(screen.getByRole('button', { name: /Mario chiede per l’animale/ })).toBeInTheDocument()
  })

  it('più richieste stanno una sotto l’altra e il tocco apre quella giusta', async () => {
    const onApri = vi.fn()
    const user = userEvent.setup()
    render(<RigaRichieste richieste={[richiesta(), richiesta({ id: 'r2', nome: 'Ada Bianchi', cane: 'Fido' })]} onApri={onApri} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: /Ada chiede per Fido/ }))
    expect(onApri).toHaveBeenCalledWith('r2')
  })

  it('finché cani e agenda non sono pronti la card non compare', () => {
    const { container } = render(<RigaRichieste richieste={[richiesta()]} pronte={false} onApri={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('l’elenco vuoto non disegna niente', () => {
    const { container } = render(<RigaRichieste richieste={[]} onApri={() => undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
