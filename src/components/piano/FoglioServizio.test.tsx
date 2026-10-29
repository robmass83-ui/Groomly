// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FoglioServizio, RigaServizio } from './FoglioServizio'

describe('riga e foglio servizio', () => {
  it('il collaboratore non apre il foglio e In sviluppo non è un pulsante', () => {
    render(<RigaServizio titolo="Richiami" stato="sviluppo" ruolo="titolare" onApri={() => { throw new Error('no') }} />)
    expect(screen.queryByRole('button', { name: 'Richiami' })).not.toBeInTheDocument()
    expect(screen.getByText('In sviluppo')).toBeInTheDocument()
  })

  it('il collaboratore vede il chip e il tocco non apre il foglio', async () => {
    const onApri = vi.fn()
    const user = userEvent.setup()
    render(<RigaServizio titolo="Promemoria" stato="manuale" ruolo="collaboratore" onApri={onApri} />)
    expect(screen.getByText('Manuale')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Promemoria/ })).not.toBeInTheDocument()
    await user.click(screen.getByText('Promemoria'))
    expect(onApri).not.toHaveBeenCalled()
  })

  it('il socio apre il foglio', async () => {
    const onApri = vi.fn()
    const user = userEvent.setup()
    render(<RigaServizio titolo="Promemoria" stato="spento" ruolo="socio" onApri={onApri} />)
    await user.click(screen.getByRole('button', { name: /Promemoria/ }))
    expect(onApri).toHaveBeenCalledOnce()
    expect(screen.getByText('Spento')).toBeInTheDocument()
  })

  it('il promemoria è un interruttore e un manuale rimasto si vede acceso', () => {
    render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'manuale', anticipoGiorni: 1, ora: '18:00' }} ruolo="titolare" onChange={() => {}} />)
    expect(screen.queryByRole('radio', { name: 'Manuale' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Automatico' })).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Promemoria' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Un giorno prima' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ora')).toHaveAttribute('type', 'time')
  })

  it('il pronto offre Manuale e Automatico, senza orario', () => {
    render(<FoglioServizio chiave="pronto" scelta={{ modo: 'manuale' }} ruolo="titolare" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Manuale. Te lo chiede quando premi Completato.' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Automatico. La mail parte da sola.' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Spento' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ora')).not.toBeInTheDocument()
  })

  it('in automatico il promemoria mostra i tre anticipi', () => {
    render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }} ruolo="titolare" onChange={() => {}} />)
    expect(screen.getByRole('radio', { name: 'Un giorno prima' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Due giorni prima' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Tre giorni prima' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ora')).toHaveAttribute('type', 'time')
  })

  it('si può rimettere spento e l’ora scelta resta', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'automatico', anticipoGiorni: 2, ora: '18:00' }} ruolo="titolare" onChange={onChange} />)
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(onChange).toHaveBeenCalledWith({ modo: 'spento', anticipoGiorni: 2, ora: '18:00' })
  })

  it('da spento l’interruttore del promemoria parte un giorno prima alle 18', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'spento' }} ruolo="titolare" onChange={onChange} />)
    expect(screen.queryByRole('radio', { name: 'Manuale' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(onChange).toHaveBeenCalledWith({ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' })
  })

  it('riaccendere il promemoria tiene i giorni e l’ora già scelti', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FoglioServizio chiave="promemoria" scelta={{ modo: 'spento', anticipoGiorni: 3, ora: '08:00' }} ruolo="titolare" onChange={onChange} />)
    await user.click(screen.getByRole('switch', { name: 'Promemoria' }))
    expect(onChange).toHaveBeenCalledWith({ modo: 'automatico', anticipoGiorni: 3, ora: '08:00' })
  })

  it('il collaboratore non cambia il link né toglie un cane dalla lista', () => {
    const onLink = vi.fn()
    const onTogli = vi.fn()
    const vista = render(
      <FoglioServizio chiave="recensione" scelta={{ modo: 'automatico' }} ruolo="collaboratore" onChange={() => {}} link="https://g.page/x" onLink={onLink} />,
    )
    expect(screen.getByLabelText('Link recensioni Google')).toBeDisabled()
    vista.rerender(
      <FoglioServizio chiave="promemoria" scelta={{ modo: 'automatico', anticipoGiorni: 1, ora: '18:00' }} ruolo="collaboratore" onChange={() => {}} />,
    )
    expect(screen.getByRole('radio', { name: 'Un giorno prima' })).toBeDisabled()
    vista.rerender(
      <FoglioServizio
        chiave="attesa"
        scelta={{ modo: 'automatico' }}
        ruolo="collaboratore"
        onChange={() => {}}
        cani={[{ id: 'w1', nome: 'Luna' }]}
        onTogli={onTogli}
      />,
    )
    expect(screen.getByRole('button', { name: /Togli/ })).toBeDisabled()
    expect(onTogli).not.toHaveBeenCalled()
    expect(onLink).not.toHaveBeenCalled()
  })

  it('da spento l’interruttore degli auguri accende senza chiedere l’ora', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<FoglioServizio chiave="auguri" scelta={{ modo: 'spento' }} ruolo="titolare" onChange={onChange} />)
    expect(screen.queryByLabelText('Ora')).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Auguri' }))
    expect(onChange).toHaveBeenCalledWith({ modo: 'automatico', ora: '09:00' })
  })

  it('gli auguri accesi non chiedono l’ora e il pronto non ha campi', () => {
    const { rerender } = render(<FoglioServizio chiave="auguri" scelta={{ modo: 'automatico', ora: '09:00' }} ruolo="titolare" onChange={() => {}} />)
    expect(screen.queryByLabelText('Ora')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Un giorno prima' })).not.toBeInTheDocument()
    rerender(<FoglioServizio chiave="pronto" scelta={{ modo: 'automatico' }} ruolo="titolare" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /Manuale/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Ora')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Link recensioni Google')).not.toBeInTheDocument()
  })

  it('in automatico la recensione mostra il link e l’attesa i nomi con Togli', async () => {
    const onTogli = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      <FoglioServizio chiave="recensione" scelta={{ modo: 'automatico' }} ruolo="titolare" onChange={() => {}} link="https://g.page/x" onLink={() => {}} />,
    )
    expect(screen.getByText('A fine giornata')).toBeInTheDocument()
    expect(screen.getByLabelText('Link recensioni Google')).toHaveValue('https://g.page/x')
    rerender(
      <FoglioServizio
        chiave="recensione"
        scelta={{ modo: 'manuale' }}
        ruolo="titolare"
        onChange={() => {}}
        link="https://g.page/x"
        onLink={() => {}}
      />,
    )
    expect(screen.getByLabelText('Link recensioni Google')).toHaveValue('https://g.page/x')
    rerender(
      <FoglioServizio
        chiave="attesa"
        scelta={{ modo: 'automatico' }}
        ruolo="titolare"
        onChange={() => {}}
        cani={[{ id: 'w1', nome: 'Luna' }]}
        onTogli={onTogli}
      />,
    )
    expect(screen.getByText('Luna')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Togli/ }))
    expect(onTogli).toHaveBeenCalledWith('w1')
  })

  it('la fedeltà ha solo l’interruttore, alto 48', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    const vista = render(<FoglioServizio chiave="fedelta" scelta={{ modo: 'spento' }} ruolo="titolare" onChange={onChange} />)
    expect(screen.queryByRole('radio', { name: 'Manuale' })).not.toBeInTheDocument()
    const interruttore = screen.getByRole('switch', { name: 'Tessera fedeltà' })
    expect(interruttore).toHaveAttribute('aria-checked', 'false')
    await user.click(interruttore)
    expect(onChange).toHaveBeenCalledWith({ modo: 'manuale' })
    onChange.mockClear()
    vista.rerender(<FoglioServizio chiave="fedelta" scelta={{ modo: 'manuale' }} ruolo="titolare" onChange={onChange} />)
    await user.click(screen.getByRole('switch', { name: 'Tessera fedeltà' }))
    expect(onChange).toHaveBeenCalledWith({ modo: 'spento' })
  })
})
