import { describe, expect, it } from 'vitest'
import type { DogContact } from '../types/models'
import { rendiPrincipale } from './contattoPrincipale'

const primario: DogContact = { id: 'primary', name: 'Mario Rossi', role: 'Proprietario', phone: '3331111111', isPrimary: true }
const extra: DogContact = { id: 'c1', name: 'Luca Rossi', role: 'Figlio', phone: '3332222222', isPrimary: false }
const owner = { name: 'Mario Rossi', phone: '3331111111' }

describe('rendiPrincipale', () => {
  it('scambia il contatto extra con il proprietario', () => {
    const r = rendiPrincipale([primario, extra], owner, 'c1')
    expect(r?.owner).toEqual({ name: 'Luca Rossi', phone: '3332222222' })
    expect(r?.contacts).toEqual([
      { id: 'c1', name: 'Luca Rossi', role: 'Figlio', phone: '3332222222', isPrimary: true },
      { id: 'primary', name: 'Mario Rossi', role: 'Proprietario', phone: '3331111111', isPrimary: false },
    ])
  })

  it('applicato due volte torna all’elenco iniziale', () => {
    const uno = rendiPrincipale([primario, extra], owner, 'c1')!
    const due = rendiPrincipale(uno.contacts, uno.owner, 'primary')!
    expect(due.owner).toEqual(owner)
    expect(due.contacts).toEqual([primario, extra])
  })

  it('senza voce principale nell’elenco il vecchio proprietario prende id primary e il suo ruolo', () => {
    const r = rendiPrincipale([extra], owner, 'c1')!
    expect(r.contacts).toHaveLength(2)
    expect(r.contacts[0]).toMatchObject({ id: 'c1', isPrimary: true, role: 'Figlio' })
    expect(r.contacts[1]).toMatchObject({ id: 'primary', isPrimary: false, name: 'Mario Rossi', phone: '3331111111', role: 'Proprietario' })
  })

  it('id inesistente o della voce principale: null', () => {
    expect(rendiPrincipale([primario, extra], owner, 'zzz')).toBeNull()
    expect(rendiPrincipale([primario, extra], owner, 'primary')).toBeNull()
  })

  it('non duplica mai un id già presente', () => {
    const r = rendiPrincipale([{ ...extra, id: 'primary' }], owner, 'primary')!
    const ids = r.contacts.map((c) => c.id)
    expect(new Set(ids).size).toBe(2)
  })
})
