import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { oraRoma } from '../../lib/disponibilita'
import type { RigaCoda } from '../../lib/codaEmail'
import { CodaInPartenza } from './CodaInPartenza'

const base: RigaCoda = {
  id: '1',
  tipo: 'promemoria',
  dogId: 'd',
  appointmentId: 'a',
  evento: 'promemoria:a:2026-10-28',
  parteIl: '2026-10-27T16:00:00.000Z',
  stato: 'in_coda',
  motivo: '',
  email: 'a@b.it',
  nomeCane: 'Fido',
  nomeCliente: '',
  inizio: null,
}

const azioni = {
  onFerma: () => undefined,
  onInvia: () => undefined,
  onEmail: () => undefined,
}

describe('coda in partenza', () => {
  it('mostra il cane, la parola del motivo e disattiva Invia se manca l’email', () => {
    render(<CodaInPartenza righe={[{ ...base, email: '', motivo: 'manca_email', parteIl: null }]} onFerma={() => {}} onInvia={() => {}} onEmail={() => {}} />)
    expect(screen.getByText('Manca l’email')).toBeInTheDocument()
    expect(screen.getByText('Manca l’email')).toHaveStyle({ color: 'var(--bad)' })
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Aggiungi email' })).toBeEnabled()
    expect(screen.getByText('Fido')).toHaveStyle({ fontWeight: '700' })
    const cerchio = screen.getByText('Fido').parentElement?.querySelector('[aria-hidden="true"]')
    expect(cerchio).toHaveTextContent('F')
    expect(cerchio).toHaveStyle({ width: '36px', height: '36px', borderRadius: '50%' })
  })

  it('la card vuota dice Niente in partenza', () => {
    const { container } = render(<CodaInPartenza righe={[]} {...azioni} />)
    expect(screen.getByText('Niente in partenza')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    const icona = container.querySelector('svg')
    expect(icona).toHaveAttribute('aria-hidden', 'true')
    expect(icona).toHaveClass('lucide-bell')
    const card = screen.getByText('Niente in partenza').closest('div')
    expect(card).toHaveStyle({ background: 'var(--card)', boxShadow: 'var(--sh-2)', border: '1px solid var(--line)' })
  })

  it('con due righe annuncia 2 in partenza', () => {
    render(<CodaInPartenza righe={[base, { ...base, id: '2', evento: 'altro', nomeCane: 'Luna' }]} {...azioni} />)
    expect(screen.getByRole('status')).toHaveTextContent(/^2 in partenza$/)
  })

  it('il chip Inviata contiene la parola Inviata', () => {
    render(<CodaInPartenza righe={[{ ...base, stato: 'inviata' }]} {...azioni} />)
    const chip = screen.getByText('Inviata')
    expect(chip).toBeInTheDocument()
    expect(chip).toHaveStyle({ color: 'var(--ok)' })
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
  })

  it('Pagina non pubblicata blocca Invia e non offre Aggiungi email', () => {
    render(<CodaInPartenza righe={[{ ...base, motivo: 'pagina_assente', parteIl: null }]} {...azioni} />)
    expect(screen.getByText('Pagina non pubblicata')).toHaveStyle({ color: 'var(--bad)' })
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Aggiungi email' })).not.toBeInTheDocument()
  })

  it('Ferma è secondario, Invia è primario, e il chip non va a capo', () => {
    render(<CodaInPartenza righe={[base]} {...azioni} />)
    const ferma = screen.getByRole('button', { name: 'Ferma' })
    const invia = screen.getByRole('button', { name: 'Invia' })
    expect(ferma).toHaveStyle({ minHeight: '48px', background: 'var(--card)' })
    expect(invia).toHaveStyle({ minHeight: '48px', background: 'var(--pri-solid)' })
    expect(ferma.parentElement).toHaveStyle({ gap: '8px' })
    expect(screen.getByText('Promemoria')).toHaveStyle({ color: 'var(--pri)', width: 'max-content' })
    expect(screen.getByText('Promemoria').parentElement).toHaveStyle({ flexShrink: '0' })
    expect(ferma.style.transition).not.toMatch(/background|color/)
    expect(invia.style.transition).not.toMatch(/background|color/)
    expect(screen.getByText('Promemoria').style.transition).not.toMatch(/background|color/)
  })

  it('mostra l’ora di Roma e la omette se la riga è manuale', () => {
    const parteIl = '2026-10-27T16:00:00.000Z'
    render(<CodaInPartenza righe={[base, { ...base, id: 'man', evento: 'man', parteIl: null, nomeCane: 'Luna' }]} {...azioni} />)
    expect(screen.getAllByText(oraRoma(new Date(parteIl)))).toHaveLength(1)
  })

  it('Aggiungi email chiama onEmail con il cane e Ferma chiama onFerma con l’id', async () => {
    const onEmail = vi.fn()
    const onFerma = vi.fn()
    const user = userEvent.setup()
    render(<CodaInPartenza righe={[{ ...base, email: '', motivo: 'manca_email', parteIl: null }]} onFerma={onFerma} onInvia={() => {}} onEmail={onEmail} />)
    await user.click(screen.getByRole('button', { name: 'Aggiungi email' }))
    await user.click(screen.getByRole('button', { name: 'Ferma' }))
    expect(onEmail).toHaveBeenCalledWith('d')
    expect(onFerma).toHaveBeenCalledWith('1')
  })

  it('Ferma è attivo in coda e se non è partita, e Invia parte solo da lì', async () => {
    const onInvia = vi.fn()
    const onFerma = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(<CodaInPartenza righe={[{ ...base, stato: 'non_inviata', motivo: 'rete' }]} onFerma={onFerma} onInvia={onInvia} onEmail={() => {}} />)
    expect(screen.getByText('Si riprova')).toHaveStyle({ color: 'var(--warn)' })
    expect(screen.getByRole('button', { name: 'Ferma' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Invia' }))
    expect(onInvia).toHaveBeenCalledWith('1')

    rerender(<CodaInPartenza righe={[{ ...base, stato: 'fermata', motivo: 'fermata' }]} onFerma={onFerma} onInvia={onInvia} onEmail={() => {}} />)
    expect(screen.getByText('Fermata')).toHaveStyle({ color: 'var(--tx2)' })
    expect(screen.getByRole('button', { name: 'Ferma' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()

    rerender(<CodaInPartenza righe={[{ ...base, stato: 'chiusa' }]} onFerma={onFerma} onInvia={onInvia} onEmail={() => {}} />)
    expect(screen.getByRole('button', { name: 'Invia' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ferma' })).toBeDisabled()
  })

  it('durante l’invio il pulsante dice Invio… ed è disattivato', () => {
    render(<CodaInPartenza righe={[base]} {...azioni} invioId="1" />)
    expect(screen.getByRole('button', { name: 'Invio…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Invia' })).not.toBeInTheDocument()
  })

  it('il chip segue il tipo quando non c’è un motivo o uno stato più urgente', () => {
    const { rerender } = render(<CodaInPartenza righe={[{ ...base, tipo: 'pronto' }]} {...azioni} />)
    expect(screen.getByText('È pronto')).toHaveStyle({ color: 'var(--tea)' })
    rerender(<CodaInPartenza righe={[{ ...base, tipo: 'auguri' }]} {...azioni} />)
    expect(screen.getByText('Auguri')).toHaveStyle({ color: 'var(--sen)' })
    rerender(<CodaInPartenza righe={[{ ...base, tipo: 'recensione' }]} {...azioni} />)
    expect(screen.getByText('Recensione')).toHaveStyle({ color: 'var(--warn)' })
    rerender(<CodaInPartenza righe={[{ ...base, tipo: 'attesa' }]} {...azioni} />)
    expect(screen.getByText('Posto libero')).toHaveStyle({ color: 'var(--ok)' })
  })
})
