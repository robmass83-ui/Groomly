import { describe, expect, it } from 'vitest'
import { candidatiRichiesta } from './candidatiRichiesta'

const rex = { id: 'rex', name: 'Rex', breed: 'Labrador', status: 'attivo' as const, contact: { phone: '349 305 3622', email: 'mario@email.it' } }
const mia = { id: 'mia', name: 'Mia', breed: 'Europeo', status: 'attivo' as const, contact: { phone: '333', email: 'laura@email.it' } }
const archivio = { id: 'old', name: 'Birba', breed: 'Meticcio', status: 'non_in_cura' as const, contact: { phone: '3493053622', email: '' } }
const morto = { id: 'x', name: 'Leo', breed: 'Boxer', status: 'deceduto' as const, contact: { phone: '3493053622', email: 'mario@email.it' } }

describe('candidati della richiesta', () => {
  it('tiene telefono o email, esclude il deceduto e non accoppia i campi vuoti', () => {
    expect(candidatiRichiesta([mia, morto, archivio, rex], '3493053622', 'mario@email.it').map((item) => item.id)).toEqual(['rex', 'old'])
    expect(candidatiRichiesta([rex], '', '')).toEqual([])
    expect(candidatiRichiesta([{ ...mia, contact: { phone: '', email: 'mario@email.it' } }], '000', 'Mario@Email.it').map((item) => item.id)).toEqual(['mia'])
  })
})
