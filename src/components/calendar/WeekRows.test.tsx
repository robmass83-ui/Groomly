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
  const onCreate = vi.fn()
  const view = render(
    <WeekRows
      days={week}
      selected={sunday}
      appointments={[
        visit('rex', 'dog-rex', 12),
        visit('kratos', 'dog-kratos', 10),
        visit('penny', 'dog-penny', 11),
      ]}
      dogs={[kratos, penny, rex]}
      services={services}
      rowWidth={242}
      onSelectDay={onSelectDay}
      onOpen={onOpen}
      onCreate={onCreate}
      {...overrides}
    />,
  )
  return { ...view, onSelectDay, onOpen, onCreate }
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
    expect(selectedStyle).toContain('color: #fff')
    const monday = screen.getByRole('button', { name: 'Seleziona Lunedì 5 ottobre' })
    expect(monday.getAttribute('style') ?? '').not.toContain('var(--pri-solid)')
    fireEvent.click(monday)
    expect(onSelectDay).toHaveBeenCalledTimes(1)
    const picked = onSelectDay.mock.calls[0][0] as Date
    expect(picked.getFullYear()).toBe(2026)
    expect(picked.getMonth()).toBe(9)
    expect(picked.getDate()).toBe(5)
  })

  it('mostra la carta intera di Kratos con nome, carattere, ora, servizio e solo il titolo della nota', () => {
    renderWeek()
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    expect(within(card).getByText('Kratos')).toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Mordace' })).toBeInTheDocument()
    expect(within(card).getByText('10:00')).toBeInTheDocument()
    expect(within(card).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(card).getByLabelText('Servizio')).toBeInTheDocument()
    const note = within(card).getByText('Ti ammazza di baci')
    expect(within(card).queryByText(/Resta/)).not.toBeInTheDocument()
    const nameStyle = within(card).getByText('Kratos').getAttribute('style') ?? ''
    expect(nameStyle).toContain('white-space: nowrap')
    expect(nameStyle).toContain('font-size: 10px')
    expect(nameStyle).toContain('font-weight: 800')
    expect(nameStyle).not.toContain('ellipsis')
    const noteStyle = note.getAttribute('style') ?? ''
    expect(noteStyle).toContain('color: var(--bad)')
    expect(noteStyle).toContain('white-space: nowrap')
    expect(noteStyle).toContain('text-overflow: ellipsis')
    expect(noteStyle).toContain('overflow: hidden')
    expect(noteStyle).toContain('display: block')
  })

  it('mette gli appuntamenti del giorno su una riga senza andare a capo, ordinati per ora', () => {
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
    expect(strip?.getAttribute('style')).toContain('flex-wrap: nowrap')
    expect(strip?.getAttribute('style')).toContain('gap: 4px')
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

  it('con tre appuntamenti e rowWidth 242 schiaccia solo l’ultima carta', () => {
    renderWeek()
    const sundayCards = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    expect(sundayCards.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'false', 'true'])
    expect(sundayCards[0].style.flexGrow).toBe('0')
    expect(sundayCards[0].style.flexShrink).toBe('0')
    expect(sundayCards[0].style.flexBasis).toBe('auto')
    expect(sundayCards[1].style.flexGrow).toBe('0')
    expect(sundayCards[1].style.flexShrink).toBe('0')
    expect(sundayCards[1].style.flexBasis).toBe('auto')
    const sliver = sundayCards[2]
    const sliverStyle = sliver.getAttribute('style') ?? ''
    expect(sliver.style.flexGrow).toBe('0')
    expect(sliver.style.flexShrink).toBe('0')
    expect(sliver.style.flexBasis).toBe('34px')
    expect(sliverStyle).toContain('width: 34px')
    expect(sliverStyle).toContain('overflow: hidden')
    const inner = sliver.firstElementChild as HTMLElement
    const innerStyle = inner.getAttribute('style') ?? ''
    expect(innerStyle).toContain('width: 100px')
    expect(innerStyle).toContain('transform: scaleX(0.3)')
    expect(innerStyle).toContain('transform-origin: left center')
  })

  it('lo swipe orizzontale apre le schegge subito e non apre la carta né crea', () => {
    const { onOpen, onCreate } = renderWeek()
    const last = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    expect(last).toHaveAttribute('data-squashed', 'true')
    swipe(last, 100, 40)
    const opened = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
    expect(opened.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'false', 'false'])
    expect(opened[2].style.flexGrow).toBe('0')
    expect(opened[2].style.flexShrink).toBe('0')
    expect(opened[2].style.flexBasis).toBe('auto')
    expect(opened[2].firstElementChild?.getAttribute('style') ?? '').not.toContain('scaleX(0.3)')
    expect(onOpen).not.toHaveBeenCalled()
    fireEvent.click(opened[2])
    expect(onOpen).not.toHaveBeenCalled()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('un gesto sotto soglia o più verticale della soglia lascia la scheggia', () => {
    renderWeek()
    const last = () => within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    swipe(last(), 100, 60)
    expect(last()).toHaveAttribute('data-squashed', 'true')
    swipe(last(), 100, 40, 10, 90)
    expect(last()).toHaveAttribute('data-squashed', 'true')
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

  it('dopo il primo swipe la scheggia in apertura ha una transizione di 220ms', () => {
    renderWeek()
    const last = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2]
    swipe(last, 100, 40)
    const style = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })[2].getAttribute('style') ?? ''
    expect(style).toContain('transition')
    expect(style).toContain('220ms')
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

  it('scala l’apertura delle schegge con transition-delay index * 80 e un secondo gesto la azzera', () => {
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
    expect(before.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'true', 'true', 'true'])
    swipe(before[3], 120, 50)
    const opening = cards()
    expect(opening.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'false', 'false', 'false'])
    expect(opening[0].style.transitionDelay).toBe('')
    expect(opening[1].style.transitionDelay).toBe('80ms')
    expect(opening[2].style.transitionDelay).toBe('160ms')
    expect(opening[3].style.transitionDelay).toBe('240ms')
    swipe(opening[3], 120, 40)
    const jumped = cards()
    expect(jumped.map((button) => button.style.transitionDelay)).toEqual(['', '0ms', '0ms', '0ms'])
    expect(jumped.every((button) => button.getAttribute('data-squashed') === 'false')).toBe(true)
  })

  it('con prefers-reduced-motion le schegge si aprono senza delay', () => {
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
      expect(cards().map((button) => button.style.transitionDelay)).toEqual(['', '0ms', '0ms', '0ms'])
      expect(cards()[3]).toHaveAttribute('data-squashed', 'false')
    } finally {
      window.matchMedia = previous
    }
  })

  it('se matchMedia manca non tratta il movimento come ridotto', () => {
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
      expect(cards()[3].style.transitionDelay).toBe('240ms')
    } finally {
      window.matchMedia = previous
    }
  })

  it('senza rowWidth misura la riga e lo scrollWidth del nome, con minimo 72', () => {
    const previousObserver = globalThis.ResizeObserver
    let rowWidthReported = 180
    class FakeObserver {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe() {
        const width = rowWidthReported
        this.callback(
          [{ contentRect: { width, height: 20, x: 0, y: 0, top: 0, left: 0, bottom: 20, right: width, toJSON() { return {} } } }] as unknown as ResizeObserverEntry[],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver
    const prototype = HTMLElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'scrollWidth')
    let nameWidth = 90
    Object.defineProperty(prototype, 'scrollWidth', { configurable: true, get: () => nameWidth })
    const two = {
      rowWidth: undefined,
      appointments: [visit('kratos', 'dog-kratos', 10), visit('penny', 'dog-penny', 11)],
      dogs: [kratos, penny],
    }
    try {
      const { unmount } = renderWeek(two)
      const measured = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
      expect(measured.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'true'])
      expect(measured[1].firstElementChild?.getAttribute('style')).toContain('width: 90px')
      unmount()
      nameWidth = 40
      rowWidthReported = 110
      renderWeek(two)
      const floored = within(dayRow('Seleziona Domenica 11 ottobre')).getAllByRole('button', { name: /^Apri / })
      expect(floored.map((button) => button.getAttribute('data-squashed'))).toEqual(['false', 'true'])
      expect(floored[1].firstElementChild?.getAttribute('style')).toContain('width: 72px')
    } finally {
      if (descriptor) Object.defineProperty(prototype, 'scrollWidth', descriptor)
      else delete (prototype as { scrollWidth?: number }).scrollWidth
      globalThis.ResizeObserver = previousObserver
    }
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
          { serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 1 },
          { serviceId: 'nodi', name: 'Nodi', durationMin: 20, price: 1 },
        ]),
      ],
      dogs: [kratos],
      rowWidth: 400,
    })
    const card = screen.getByRole('button', { name: 'Apri Kratos' })
    expect(within(card).queryByText('Bagno')).not.toBeInTheDocument()
    expect(within(card).queryByText('Nodi')).not.toBeInTheDocument()
    expect(within(card).getByRole('img', { name: 'Gestione nodi' })).toBeInTheDocument()
    expect(within(card).getAllByLabelText('Servizio')).toHaveLength(1)
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
})
