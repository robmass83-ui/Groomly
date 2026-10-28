// @vitest-environment happy-dom
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatHomeDate } from '../../lib/format'
import type { Appointment, AppointmentStatus, Dog, Service } from '../../types/models'
import { WeekRows } from './WeekRows'

const services: Service[] = []

const week = Array.from({ length: 7 }, (_, index) => new Date(2026, 9, 5 + index))
const sunday = week[6]

function dog(id: string, name: string, temperament: Dog['temperament'], criticalNote = ''): Dog {
  return { id, name, temperament, criticalNote, status: 'attivo' } as Dog
}

function visit(
  id: string,
  dogId: string,
  hour: number,
  day = 11,
  status: AppointmentStatus = 'programmato',
  lines: Appointment['services'] = [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 1 }],
): Appointment {
  return {
    id,
    dogId,
    start: new Date(2026, 9, day, hour, 0, 0, 0),
    services: lines,
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    criticalNote: 'Nota appuntamento. Ignora',
  } as Appointment
}

const kratos = dog('dog-kratos', 'Kratos', 'mordace', 'Ti ammazza di baci. Resta')
const penny = dog('dog-penny', 'Penny', 'bravo')
const rex = dog('dog-rex', 'Rex', 'agitato')

function renderWeek(overrides: Partial<ComponentProps<typeof WeekRows>> = {}) {
  const onSelectDay = vi.fn()
  const onOpen = vi.fn()
  const onOpenDay = vi.fn()
  const onCreate = vi.fn()
  const view = render(
    <WeekRows
      days={week}
      selected={sunday}
      appointments={[
        visit('rex', 'dog-rex', 12),
        {
          ...visit('kratos', 'dog-kratos', 10),
          extraNotes: [{ id: 'n1', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }],
        },
        visit('penny', 'dog-penny', 11),
      ]}
      dogs={[kratos, penny, rex]}
      services={services}
      rowWidth={242}
      onSelectDay={onSelectDay}
      onOpen={onOpen}
      onOpenDay={onOpenDay}
      onCreate={onCreate}
      {...overrides}
    />,
  )
  return { ...view, onSelectDay, onOpen, onOpenDay, onCreate }
}

function dayRow(label: string): HTMLElement {
  const button = screen.getByRole('button', { name: label })
  const row = button.parentElement
  if (!row) throw new Error(`manca la riga di ${label}`)
  return row
}

function swipe(target: HTMLElement, fromX: number, toX: number, fromY = 40, toY = 42) {
  fireEvent.pointerDown(target, { clientX: fromX, clientY: fromY })
  fireEvent.pointerUp(target, { clientX: toX, clientY: toY })
}

function cards(): HTMLElement[] {
  return screen.getAllByRole('button', { name: /^Apri / })
}

describe('WeekRows', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('elenca i sette giorni e seleziona quello passato', () => {
    const { onSelectDay } = renderWeek()
    const selectors = screen.getAllByRole('button', { name: /^Seleziona / })
    expect(selectors).toHaveLength(7)
    expect(selectors.map((button) => button.getAttribute('aria-label'))).toEqual(
      week.map((day) => `Seleziona ${formatHomeDate(day)}`),
    )
    expect(formatHomeDate(sunday)).toBe('Domenica 11 ottobre')
    const selected = screen.getByRole('button', { name: 'Seleziona Domenica 11 ottobre' })
    const selectedStyle = selected.getAttribute('style') ?? ''
    expect(selectedStyle).toContain('background: var(--pri-solid)')
    expect(selectedStyle).toContain('color: var(--on-pri)')
    const monday = screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' })
    expect(monday.getAttribute('style') ?? '').not.toContain('var(--pri-solid)')
    fireEvent.click(monday)
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    const picked = onSelectDay.mock.calls[0][0] as Date
    expect(picked.getFullYear()).toBe(2026)
    expect(picked.getMonth()).toBe(9)
    expect(picked.getDate()).toBe(5)
  })

  it('mostra la carta intera di Kratos con nome, carattere, ora, servizio e solo il titolo della nota e altro', () => {
    renderWeek()
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    expect(within(card).getByText('Kratos')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Mordace' })).toBeInTheDocument()
    expect(within(card).getByText('10:00')).toBeInTheDocument()
    expect(within(card).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(card).getByLabelText('Servizio')).toBeInTheDocument()
    const note = within(card).getByText('Ti ammazza di baci')
    const altro = within(card).getByText('altro')
    expect(note.parentElement).toBe(altro.parentElement)
    expect(note.parentElement?.getAttribute('style') ?? '').toContain('display: flex')
    expect(within(card).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
    expect(within(card).queryByText(/Resta/)).not.toBeInTheDocument()
    const nameStyle = within(card).getByText('Kratos').getAttribute('style') ?? ''
    expect(nameStyle).toContain('white-space: nowrap')
    expect(nameStyle).toContain('font-size: 12px')
    expect(nameStyle).toContain('font-weight: 800')
    expect(nameStyle).not.toContain('ellipsis')
    const noteStyle = note.getAttribute('style') ?? ''
    expect(noteStyle).toContain('color: var(--bad)')
    expect(noteStyle).toContain('overflow-wrap: anywhere')
    expect(noteStyle).toContain('white-space: nowrap')
    expect(noteStyle).toContain('ellipsis')
    expect(noteStyle).toContain('display: block')
    const altroStyle = altro.getAttribute('style') ?? ''
    expect(altroStyle).toContain('flex-grow: 0')
    expect(altroStyle).toContain('flex-shrink: 0')
    expect(altroStyle).toContain('flex-basis: auto')
    expect(altroStyle).toContain('font-weight: 700')
    expect(altroStyle).toContain('color: var(--tx2)')
  })

  it('un cane con note vecchie e una visita senza note non mostra altro', () => {
    const old = dog('dog-old', 'Vecchio', 'bravo', 'Morde. Dettaglio')
    old.extraNotes = [{ id: 'old', text: 'Pelo cortissimo', createdAt: new Date('2026-10-01T00:00:00.000Z') }]
    renderWeek({
      appointments: [visit('old', 'dog-old', 10)],
      dogs: [old],
      rowWidth: 400,
    })
    const card = screen.getByRole('button', { name: 'Apri Vecchio' })
    expect(within(card).getByText('Morde')).toBeInTheDocument()
    expect(within(card).queryByText('altro')).not.toBeInTheDocument()
    expect(within(card).queryByText('Pelo cortissimo')).not.toBeInTheDocument()
    expect(within(card).queryByText('Dettaglio')).not.toBeInTheDocument()
  })

  it('mette gli appuntamenti del giorno a capo, ordinati per ora', () => {
    renderWeek()
    const row = dayRow('Seleziona Domenica 11 ottobre')
    const sundayCards = within(row).getAllByRole('button', { name: /^Apri / })
    expect(sundayCards.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Apri Kratos',
      'Apri Penny',
      'Apri Rex',
    ])
    expect(within(row).getByText('10:00')).toBeInTheDocument()
    expect(within(row).getByText('11:00')).toBeInTheDocument()
    expect(within(row).getByText('12:00')).toBeInTheDocument()
    const strip = sundayCards[0].parentElement
    expect(strip?.getAttribute('style')).toContain('display: flex')
    expect(strip?.getAttribute('style')).toContain('flex-wrap: wrap')
    expect(strip?.getAttribute('style')).toContain('gap: 8px')
    expect(strip?.getAttribute('style')).toContain('overflow-x: hidden')
  })

  it('due appuntamenti nello stesso giorno sono biglietti a misura del testo che vanno a capo', () => {
    renderWeek({
      rowWidth: 150,
      appointments: [
        visit('kratos', 'dog-kratos', 10, 11, 'programmato', [
          { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 1 },
          { serviceId: 'nodi', name: 'Nodi', durationMin: 20, price: 1 },
        ]),
        { ...visit('penny', 'dog-penny', 11), provvisorio: true },
      ],
      dogs: [kratos, penny],
    })
    const row = dayRow('Seleziona Domenica 11 ottobre')
    const sundayCards = within(row).getAllByRole('button', { name: /^Apri / })
    expect(sundayCards).toHaveLength(2)
    for (const button of sundayCards) {
      expect(button.getAttribute('data-squashed')).not.toBe('true')
      expect(button.style.flexGrow).not.toBe('1')
      const style = button.getAttribute('style') ?? ''
      expect(style).not.toContain('scaleX')
      expect(button.innerHTML).not.toContain('scaleX')
      expect(style).not.toContain('34px')
      expect(button.style.flexGrow).toBe('0')
      expect(button.style.flexShrink).toBe('0')
      expect(button.style.flexBasis).toBe('auto')
      expect(style).toContain('width: auto')
      expect(style).toContain('border-width: 1px')
      expect(style).toContain('border-style: solid')
      expect(style).toContain('border-color: var(--line)')
      expect(style).toContain('border-radius: 8px')
      expect(style).toContain('padding: 4px 8px')
    }
    const stripStyle = sundayCards[0].parentElement?.getAttribute('style') ?? ''
    expect(stripStyle).toContain('display: flex')
    expect(stripStyle).toContain('flex-wrap: wrap')
    expect(stripStyle).toContain('gap: 8px')
    expect(stripStyle).toContain('overflow-x: hidden')
    const kratosCard = within(row).getByRole('button', { name: 'Apri Kratos' })
    expect(within(kratosCard).getByText('Kratos')).toBeInTheDocument()
    expect(within(kratosCard).getByText('10:00')).toBeInTheDocument()
    expect(kratosCard.textContent).toContain('+1')
    expect(within(kratosCard).getByLabelText('Servizio')).toBeInTheDocument()
    const pennyCard = within(row).getByRole('button', { name: 'Apri Penny' })
    expect(within(pennyCard).getByText('Penny')).toBeInTheDocument()
    expect(within(pennyCard).getByText('11:00')).toBeInTheDocument()
    expect(pennyCard.textContent ?? '').not.toContain('+1')
    expect(pennyCard.getAttribute('style') ?? '').toContain('background: var(--warn-s)')
    const create = within(row).getByRole('button', { name: 'Nuovo Domenica 11 ottobre' })
    const createStyle = create.getAttribute('style') ?? ''
    expect(create.style.flexGrow).toBe('1')
    expect(create.style.flexShrink).toBe('0')
    expect(create.style.flexBasis).toBe('24px')
    expect(createStyle).toContain('min-height: 28px')
    expect(createStyle).not.toContain('1 1 auto')
    const emptyDay = dayRow('Seleziona Lunedì 5 ottobre')
    const emptyCreate = within(emptyDay).getByRole('button', { name: 'Nuovo Lunedì 5 ottobre' })
    expect(within(emptyDay).queryByRole('button', { name: /^Apri / })).not.toBeInTheDocument()
    expect(emptyCreate.getAttribute('style') ?? '').toContain('min-height: 28px')
    expect(emptyDay.getAttribute('style') ?? '').toContain('grid-template-columns: 52px')
  })

  it('non mescola gli appuntamenti di un altro giorno', () => {
    renderWeek({
      appointments: [
        visit('sab', 'dog-penny', 9, 10),
        visit('kratos', 'dog-kratos', 10, 11),
      ],
      dogs: [kratos, penny],
    })
    const sundayRow = dayRow('Seleziona Domenica 11 ottobre')
    const saturdayRow = dayRow('Seleziona Sabato 10 ottobre')
    expect(within(sundayRow).getByRole('button', { name: 'Apri Kratos' })).toBeInTheDocument()
    expect(within(sundayRow).queryByRole('button', { name: 'Apri Penny' })).not.toBeInTheDocument()
    expect(within(saturdayRow).getByRole('button', { name: 'Apri Penny' })).toBeInTheDocument()
    expect(within(saturdayRow).getByText('09:00')).toBeInTheDocument()
  })

  it('con tre appuntamenti e rowWidth 242 nessun biglietto è schiacciato', () => {
    renderWeek()
    const sundayCards = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    expect(sundayCards.map((button) => button.getAttribute('data-squashed'))).toEqual([null, null, null])
    for (const button of sundayCards) {
      expect(button.style.flexGrow).toBe('0')
      expect(button.style.flexShrink).toBe('0')
      expect(button.style.flexBasis).toBe('auto')
      const style = button.getAttribute('style') ?? ''
      expect(style).toContain('width: auto')
      expect(style).not.toContain('34px')
      expect(button.innerHTML).not.toContain('scaleX')
    }
  })

  it('lo swipe orizzontale non apre la carta né crea', () => {
    const { onOpen, onCreate } = renderWeek()
    const last = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    expect(last.getAttribute('data-squashed')).not.toBe('true')
    expect(last.innerHTML).not.toContain('scaleX')
    swipe(last, 100, 40)
    const opened = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    expect(opened.map((button) => button.getAttribute('data-squashed'))).toEqual([null, null, null])
    expect(opened[2].style.flexGrow).toBe('0')
    expect(opened[2].style.flexShrink).toBe('0')
    expect(opened[2].style.flexBasis).toBe('auto')
    expect(opened[2].innerHTML).not.toContain('scaleX')
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(opened[2])
    expect(onOpen).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('un gesto sotto soglia o più verticale della soglia non blocca il tap', () => {
    const { onOpen } = renderWeek()
    const last = () => within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    swipe(last(), 100, 60)
    fireEvent.click(last())
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith('rex')
    onOpen.mockClear()
    swipe(last(), 100, 40, 10, 90)
    fireEvent.click(last())
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(last().innerHTML).not.toContain('scaleX')
    expect(last().getAttribute('data-squashed')).not.toBe('true')
  })

  it('uno swipe senza click non blocca il tap successivo sulla stessa carta', () => {
    const { onOpen } = renderWeek()
    const sundayCards = () => within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    swipe(sundayCards()[2], 100, 40)
    expect(onOpen).not.toHaveBeenCalled()
    const card = sundayCards()[2]
    fireEvent.pointerDown(card, { clientX: 20, clientY: 20 })
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith('rex')
  })

  it('dopo lo swipe il biglietto resta a misura del testo', () => {
    renderWeek()
    const last = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    swipe(last, 100, 40)
    const card = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    const style = card.getAttribute('style') ?? ''
    expect(style).toContain('width: auto')
    expect(style).not.toContain('34px')
    expect(style).not.toContain('scaleX')
    expect(card.innerHTML).not.toContain('scaleX')
  })

  it('un click senza movimento apre l’appuntamento e non crea', () => {
    const { onOpen, onCreate, onSelectDay } = renderWeek()
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    swipe(card, 20, 20, 15, 15)
    fireEvent.click(card)
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith('kratos')
    expect(onCreate).not.toHaveBeenCalled()
    expect(onSelectDay).not.toHaveBeenCalled()
  })

  it('lo spazio vuoto della riga crea l’appuntamento di quel giorno e lo swipe non lo attiva', () => {
    const { onCreate, onOpen } = renderWeek()
    expect(screen.getAllByRole('button', { name: /^Nuovo / })).toHaveLength(7)
    const create = screen.getByRole('button', { name: 'Nuovo Domenica 11 ottobre' })
    const strip = screen.getByRole('button', { name: 'Apri Kratos' }).parentElement
    expect(strip?.contains(create)).toBe(true)
    fireEvent.click(create)
    expect(onCreate).toHaveBeenCalledTimes(1)
    const day = onCreate.mock.calls[0][0] as Date
    expect(day.getFullYear()).toBe(2026)
    expect(day.getMonth()).toBe(9)
    expect(day.getDate()).toBe(11)
    expect(onOpen).not.toHaveBeenCalled()

    onCreate.mockClear()
    swipe(create, 180, 100, 8, 10)
    fireEvent.click(create)
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('quattro appuntamenti restano biglietti interi, senza ritardo di apertura', () => {
    renderWeek({
      appointments: [
        visit('lola', 'dog-lola', 13),
        visit('rex', 'dog-rex', 12),
        visit('kratos', 'dog-kratos', 10),
        visit('penny', 'dog-penny', 11),
      ],
      dogs: [kratos, penny, rex, dog('dog-lola', 'Lola', 'bravo')],
    })
    const before = cards()
    expect(before.map((button) => button.getAttribute('data-squashed'))).toEqual([null, null, null, null])
    expect(before.every((button) => !button.innerHTML.includes('scaleX'))).toBe(true)
    swipe(before[3], 120, 50)
    const opening = cards()
    expect(opening.map((button) => button.style.transitionDelay)).toEqual(['', '', '', ''])
    expect(opening.every((button) => button.style.flexBasis === 'auto')).toBe(true)
    expect(opening.every((button) => button.style.flexGrow !== '1')).toBe(true)
    swipe(opening[3], 120, 40)
    const jumped = cards()
    expect(jumped.every((button) => button.getAttribute('data-squashed') !== 'true')).toBe(true)
    expect(jumped.every((button) => !button.innerHTML.includes('scaleX'))).toBe(true)
  })

  it('con prefers-reduced-motion i biglietti non sono schiacciati', () => {
    const previous = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia
    try {
      renderWeek({
        appointments: [
          visit('kratos', 'dog-kratos', 10),
          visit('penny', 'dog-penny', 11),
          visit('rex', 'dog-rex', 12),
          visit('lola', 'dog-lola', 13),
        ],
        dogs: [kratos, penny, rex, dog('dog-lola', 'Lola', 'bravo')],
      })
      swipe(cards()[3], 100, 40)
      expect(cards().every((button) => button.getAttribute('data-squashed') !== 'true')).toBe(true)
      expect(cards()[3].innerHTML).not.toContain('scaleX')
      expect(cards()[3].style.flexBasis).toBe('auto')
    } finally {
      window.matchMedia = previous
    }
  })

  it('se matchMedia manca i biglietti restano a misura del testo', () => {
    const previous = window.matchMedia
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    try {
      renderWeek({
        appointments: [
          visit('kratos', 'dog-kratos', 10),
          visit('penny', 'dog-penny', 11),
          visit('rex', 'dog-rex', 12),
          visit('lola', 'dog-lola', 13),
        ],
        dogs: [kratos, penny, rex, dog('dog-lola', 'Lola', 'bravo')],
      })
      swipe(cards()[3], 100, 40)
      expect(cards()[3].getAttribute('data-squashed')).not.toBe('true')
      expect(cards()[3].innerHTML).not.toContain('scaleX')
      expect(cards()[3].style.flexBasis).toBe('auto')
    } finally {
      window.matchMedia = previous
    }
  })

  it('senza rowWidth i biglietti restano a misura del testo', () => {
    renderWeek({
      rowWidth: undefined,
      appointments: [visit('kratos', 'dog-kratos', 10), visit('penny', 'dog-penny', 11)],
      dogs: [kratos, penny],
    })
    const measured = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    expect(measured).toHaveLength(2)
    for (const button of measured) {
      expect(button.getAttribute('data-squashed')).not.toBe('true')
      expect(button.style.flexGrow).toBe('0')
      expect(button.style.flexBasis).toBe('auto')
      expect(button.getAttribute('style') ?? '').toContain('width: auto')
      expect(button.innerHTML).not.toContain('scaleX')
      expect(button.innerHTML).not.toContain('width: 90px')
      expect(button.innerHTML).not.toContain('width: 72px')
    }
    const strip = measured[0].parentElement?.getAttribute('style') ?? ''
    expect(strip).toContain('flex-wrap: wrap')
    expect(strip).toContain('overflow-x: hidden')
  })

  it('non si rompe se ResizeObserver manca', () => {
    const previousObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = undefined as unknown as typeof ResizeObserver
    try {
      expect(() => renderWeek({ rowWidth: undefined })).not.toThrow()
      expect(screen.getByRole('button', { name: 'Apri Kratos' })).toBeInTheDocument()
    } finally {
      globalThis.ResizeObserver = previousObserver
    }
  })

  it('disegna solo l’icona del servizio e la prende dal catalogo', () => {
    const { unmount } = renderWeek()
    const plain = screen.getByRole('button', { name: 'Apri Kratos' })
    expect(within(plain).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(plain).queryByRole('img', { name: 'Bagno' })).not.toBeInTheDocument()
    expect(within(plain).getByLabelText('Servizio')).toBeInTheDocument()
    unmount()

    const catalog: Service[] = [{
      id: 'nodi',
      name: 'Gestione nodi',
      iconKey: 'nodi',
      kind: 'principale',
      durationMin: { piccola: 20, media: 20, grande: 20 },
      price: { piccola: 1, media: 1, grande: 1 },
      order: 0,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]
    renderWeek({
      services: catalog,
      appointments: [
        visit('kratos', 'dog-kratos', 10, 11, 'programmato', [
          { serviceId: 'nodi', name: 'Nodi', durationMin: 20, price: 1 },
          { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 1 },
        ]),
      ],
      dogs: [kratos],
      rowWidth: 400,
    })
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    expect(within(card).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(card).queryByText('Nodi')).not.toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Gestione nodi' })).toBeInTheDocument()
    expect(within(card).queryByLabelText('Servizio')).not.toBeInTheDocument()
    expect(card.textContent).toContain('+1')
  })

  it('mette il giorno a sinistra in una colonna da 52px', () => {
    renderWeek()
    const style = dayRow('Seleziona Domenica 11 ottobre').getAttribute('style') ?? ''
    expect(style).toContain('display: grid')
    expect(style).toContain('grid-template-columns: 52px')
  })

  it('tiene le icone dei servizi su una riga, senza la dicitura', () => {
    renderWeek()
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    const serviceRow = within(card).getByLabelText('Servizio').parentElement
    expect(serviceRow?.getAttribute('style') ?? '').toContain('flex-wrap: nowrap')
    expect(serviceRow?.textContent).toBe('')
  })

  it('prima dello swipe la striscia tiene il pan verticale', () => {
    renderWeek()
    const strip = screen.getByRole('button', { name: 'Apri Kratos' }).parentElement
    expect(strip?.getAttribute('style') ?? '').toContain('touch-action: pan-y')
  })

  it('segna completato, cane archiviato, disdetto e non venuto', () => {
    const archived = dog('dog-old', 'Vecchio', 'bravo')
    archived.status = 'non_in_cura'
    renderWeek({
      rowWidth: 800,
      dogs: [kratos, penny, rex, archived],
      appointments: [
        visit('done', 'dog-kratos', 10, 11, 'completato'),
        visit('old', 'dog-old', 11, 11, 'programmato'),
        visit('off', 'dog-penny', 12, 11, 'disdetto'),
        visit('miss', 'dog-rex', 13, 11, 'non_venuto'),
      ],
    })
    const done = screen.getByRole('button', { name: 'Apri Kratos' })
    const check = within(done).getByLabelText('Completato')
    expect(check).toHaveAttribute('width', '12')
    expect(check).toHaveAttribute('height', '12')
    expect(check).toHaveAttribute('stroke', 'var(--ok)')
    const old = screen.getByRole('button', { name: 'Apri Vecchio' })
    const archive = within(old).getByLabelText('Cane archiviato')
    expect(archive).toHaveAttribute('width', '12')
    expect(archive).toHaveAttribute('height', '12')
    for (const name of ['Apri Penny', 'Apri Rex']) {
      const style = screen.getByRole('button', { name }).getAttribute('style') ?? ''
      expect(style).toContain('text-decoration: line-through')
      expect(style).toContain('color: var(--tx3)')
    }
  })

  it('il giorno chiuso non selezionato ha il velo e la scritta Chiuso', () => {
    renderWeek({
      closures: [{
        id: 'ferie',
        reason: 'Ferie',
        startDay: '2026-10-05',
        endDay: '2026-10-05',
        createdAt: new Date(2026, 9, 1),
        updatedAt: new Date(2026, 9, 1),
      }],
    })
    const monday = screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' })
    expect(monday.style.backgroundImage).toContain('repeating-linear-gradient(-45deg, transparent 0 4px, var(--closed-line) 4px 5px)')
    expect(monday.style.backgroundColor).toBe('var(--closed)')
    expect(within(monday).getByText('Chiuso').getAttribute('style') ?? '').toContain('var(--bad)')
  })

  it('il giorno chiuso selezionato resta blu e Chiuso è bianco', () => {
    renderWeek({
      selected: week[0],
      closures: [{
        id: 'ferie',
        reason: 'Ferie',
        startDay: '2026-10-05',
        endDay: '2026-10-05',
        createdAt: new Date(2026, 9, 1),
        updatedAt: new Date(2026, 9, 1),
      }],
    })
    const monday = screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' })
    const style = monday.getAttribute('style') ?? ''
    expect(style).toContain('background: var(--pri-solid)')
    expect(style).not.toContain('var(--closed)')
    expect(within(monday).getByText('Chiuso').getAttribute('style') ?? '').toContain('var(--on-pri)')
  })

  it('la carta personale ha il titolo e non lo sticker né i servizi', () => {
    renderWeek({
      appointments: [{
        id: 'dent',
        dogId: '',
        kind: 'personale',
        title: 'Dentista',
        start: new Date(2026, 9, 11, 18, 0, 0, 0),
        services: [],
        status: 'programmato',
        createdAt: new Date(),
        updatedAt: new Date(),
      }],
      dogs: [],
    })
    const card = screen.getByRole('button', { name: 'Apri Dentista' })
    expect(within(card).getByText('Dentista')).toBeInTheDocument()
    expect(within(card).getByText('18:00')).toBeInTheDocument()
    expect(within(card).queryByRole('img')).not.toBeInTheDocument()
    expect(within(card).queryByText('Bagno')).not.toBeInTheDocument()
    expect(card.getAttribute('style') ?? '').toContain('background: var(--personal-s)')
  })

  it('con piu di quattro cani mostra il conteggio e apre il giorno', () => {
    const tanti = [8, 9, 10, 11, 12].map((hour) => visit(`c${hour}`, `dog-${hour}`, hour))
    const { onOpenDay } = renderWeek({
      appointments: tanti,
      dogs: tanti.map((item) => dog(item.dogId, item.dogId, 'bravo')),
    })
    expect(screen.queryByRole('button', { name: /^Apri / })).not.toBeInTheDocument()
    const conteggio = screen.getByRole('button', { name: '5 cani · 2h30' })
    fireEvent.click(conteggio)
    expect(onOpenDay).toHaveBeenCalledWith(sunday)
  })

  it('con tre cani tiene le card', () => {
    renderWeek()
    expect(screen.getAllByRole('button', { name: /^Apri / }).length).toBeGreaterThan(0)
    expect(screen.getByText('3 cani · 1h30')).toBeInTheDocument()
  })
})
