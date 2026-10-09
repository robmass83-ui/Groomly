import { describe, expect, it } from 'vitest'
import { buildSearchKey, countDogs, dogMeta, dogSubtitle, dogThirdLine, normalizeSearch, sortDogs, visibleDogs, type DogChip, type DogTab } from './dogList'
import type { Appointment, Dog, DogStatus } from '../types/models'

function dog(partial: Pick<Dog, 'id' | 'name'> & Partial<Dog>): Dog {
  const breed = partial.breed ?? ''
  const contact = partial.contact ?? { name: '', phone: '111' }
  const status: DogStatus = partial.status ?? 'attivo'
  return {
    species: 'cane',
    ageCategory: 'adulto',
    size: 'piccola',
    temperament: 'bravo',
    clientType: 'occasionale',
    status,
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
    updatedAt: new Date('2026-10-03T12:00:00.000Z'),
    ...partial,
    contact,
    breed,
    tags: partial.tags ?? [],
    servicePrices: partial.servicePrices ?? [],
    hiddenServiceIds: partial.hiddenServiceIds ?? [],
    customFields: partial.customFields ?? [],
    gallery: partial.gallery ?? [],
    contacts: partial.contacts ?? [],
    searchKey: buildSearchKey(partial.name, breed, contact.name),
  }
}

describe('buildSearchKey', () => {
  it('unisce nome, razza e proprietario senza accenti e senza telefono', () => {
    expect(buildSearchKey('  Caffè ', 'Barboncino', 'Lea')).toBe('caffe barboncino lea')
    expect(normalizeSearch('Caffè')).toBe('caffe')
    expect(buildSearchKey('Bobi', '', '')).toBe('bobi')
    expect(buildSearchKey('Bobi', '', '').includes('333')).toBe(false)
  })
})

describe('visibleDogs', () => {
  const dogs = [
    dog({ id: '1', name: 'Zoe', breed: 'Bassotto', contact: { name: 'Sara', phone: '333' } }),
    dog({ id: '2', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '111' } }),
    dog({
      id: '3', name: 'Micio', species: 'gatto', breed: 'Europeo', ageCategory: 'anziano',
      temperament: 'mordace', clientType: 'mensile', contact: { name: 'Lea', phone: '222' },
    }),
    dog({ id: '4', name: 'Nero', species: 'gatto', status: 'deceduto', contact: { name: 'Ada', phone: '444' } }),
  ]

  it('filtra tab e chip insieme e ignora il telefono', () => {
    expect(visibleDogs(dogs, 'attivi', 'tutti', '').map((item) => item.name)).toEqual(['Zoe', 'Bobi', 'Micio'])
    const accent = dog({ id: '5', name: 'Caffè' })
    expect(visibleDogs([accent], 'attivi', 'tutti', 'caffe').map((item) => item.name)).toEqual(['Caffè'])
    expect(visibleDogs(dogs, 'mensili', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'gatti', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'archivio', 'gatti', '').map((item) => item.name)).toEqual(['Nero'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'lea').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'tutti', 'Caffè')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'tutti', '222')).toEqual([])
    expect(visibleDogs(dogs, 'attivi', 'mordaci', '').map((item) => item.name)).toEqual(['Micio'])
    expect(visibleDogs(dogs, 'attivi', 'anziani', '').map((item) => item.name)).toEqual(['Micio'])
  })

  it('abbrevia il proprietario e tiene in agenda chi ha un prossimo', () => {
    const birba = dog({ id: '1', name: 'Birba', breed: 'Barboncino toy', contact: { name: 'Maria Pinna', phone: '1' } })
    expect(dogSubtitle(birba, new Date(2026, 9, 3))).toBe('Barboncino toy · Adulto · M. Pinna')
    const now = new Date(2026, 9, 3, 8, 0, 0, 0)
    const altro = dog({ id: '2', name: 'Nero' })
    const appointments: Appointment[] = [
      visit('next', '1', new Date(2026, 9, 6, 10, 0, 0, 0)),
      visit('done', '2', new Date(2026, 9, 8, 10, 0, 0, 0), 'completato'),
    ]
    expect(visibleDogs([birba, altro], 'attivi', 'in_agenda', '', appointments, now).map((item) => item.name)).toEqual(['Birba'])
  })

  it('conta sull\u2019intera lista', () => {
    expect(countDogs(dogs)).toEqual({ attivi: 3, mensili: 1, occasionali: 2, archivio: 1 })
    const tab: DogTab = 'attivi'
    const chip: DogChip = 'gatti'
    expect(countDogs(visibleDogs(dogs, tab, chip, 'lea')).attivi).toBe(1)
    expect(countDogs(dogs).attivi).toBe(3)
  })
})

function visit(id: string, dogId: string, start: Date, status: Appointment['status'] = 'programmato'): Appointment {
  return {
    id,
    dogId,
    start,
    services: [{ serviceId: 'bagno', name: 'Bagno', durationMin: 30, price: 20 }],
    status,
    createdAt: start,
    updatedAt: start,
  }
}

describe('dogMeta', () => {
  it('omette i pezzi vuoti e usa l\u2019etichetta italiana', () => {
    const sara = dog({ id: '1', name: 'Bobi', breed: 'Labrador', contact: { name: 'Sara', phone: '1' } })
    expect(dogMeta(sara)).toBe('Labrador · Adulto · Sara')
    expect(dogSubtitle(sara, new Date(2026, 9, 3))).toBe('Labrador · Adulto · Sara')
    expect(dogMeta(dog({ id: '2', name: 'Bobi', breed: '  ', contact: { name: '', phone: '1' } }))).toBe('Adulto')
  })
})

describe('sortDogs', () => {
  it('ordina in italiano e mette prima il prossimo più vicino', () => {
    const ada = dog({ id: '2', name: 'Ada' })
    const bobi = dog({ id: 'b', name: 'Bobi' })
    const same = dog({ id: 'a', name: 'Bobi' })
    const zoe = dog({ id: '3', name: 'Zoe' })
    expect(sortDogs([zoe, bobi, ada, same], 'alfabetico', () => null).map((item) => item.id)).toEqual(['2', 'a', 'b', '3'])
    const nextOf = (item: Dog) => (item.id === '3' ? new Date(2026, 9, 10) : item.id === 'b' ? new Date(2026, 9, 6) : null)
    expect(sortDogs([ada, zoe, same, bobi], 'prossimo', nextOf).map((item) => item.id)).toEqual(['b', '3', '2', 'a'])
  })
})

describe('dogThirdLine', () => {
  const now = new Date(2026, 9, 3, 8, 0, 0, 0)

  it('dice Oggi, la data breve, Da fissare o nessun appuntamento', () => {
    const oggi = dog({ id: 'oggi', name: 'Oggi', clientType: 'occasionale' })
    const altro = dog({ id: 'altro', name: 'Altro', clientType: 'occasionale' })
    const luna = dog({ id: 'luna', name: 'Luna', clientType: 'mensile' })
    const rex = dog({ id: 'rex', name: 'Rex', clientType: 'mensile' })
    const nina = dog({ id: 'nina', name: 'Nina', clientType: 'occasionale' })
    expect(dogThirdLine(oggi, [visit('o', 'oggi', new Date(2026, 9, 3, 8, 30, 0, 0))], now, 7)).toEqual({ text: 'Oggi 08:30', tone: 'tx3' })
    expect(dogThirdLine(altro, [visit('a', 'altro', new Date(2026, 9, 6, 10, 0, 0, 0))], now, 7)).toEqual({ text: 'Mar 6 ott 10:00', tone: 'tx3' })
    expect(dogThirdLine(luna, [visit('l', 'luna', new Date(2026, 8, 3, 9, 0, 0, 0), 'completato')], now, 7)).toEqual({ text: 'Da fissare · ultimo 3 set', tone: 'warn' })
    expect(dogThirdLine(rex, [], now, 7)).toEqual({ text: 'Da fissare', tone: 'warn' })
    expect(dogThirdLine(nina, [], now, 7)).toEqual({ text: 'Nessun appuntamento', tone: 'tx3' })
    expect(dogThirdLine(dog({ id: 'arc', name: 'Nero', status: 'deceduto' }), [], now, 7)).toEqual({ text: 'Deceduto', tone: 'tx3' })
    expect(dogThirdLine(dog({ id: 'out', name: 'Kira', status: 'non_in_cura' }), [], now, 7)).toEqual({ text: 'Non più in cura', tone: 'tx3' })
  })
})
