import { describe, expect, it } from 'vitest'
import { accountNonEliminabile } from './accountProtetto'
import { caniToelettatiNelMese } from './caniDelMese'
import { avanzamentoSalone, passiCompletamento } from './completaSalone'
import { confermaEliminaValida } from './confermaElimina'
import { etichettaDispositivo } from './dispositivoAttuale'
import { MOSTRA_INVITO_COLLEGA } from './invitoCollega'

describe('menu account', () => {
  it('conta i sei passi e il profilo è completo solo con il dato fiscale', () => {
    const aperti = passiCompletamento({ logo: true, indirizzo: true, orari: false, listino: true, backup: false, email: true, fiscale: false })
    expect(aperti.map((passo) => passo.fatto)).toEqual([true, false, true, false, true, false])
    expect(avanzamentoSalone(aperti)).toEqual({ fatti: 3, tutti: 6, completo: false })
    const senzaFiscale = passiCompletamento({ logo: true, indirizzo: true, orari: true, listino: true, backup: true, email: true, fiscale: false })
    expect(avanzamentoSalone(senzaFiscale)).toEqual({ fatti: 5, tutti: 6, completo: false })
    const chiusi = passiCompletamento({ logo: true, indirizzo: true, orari: true, listino: true, backup: true, email: true, fiscale: true })
    expect(avanzamentoSalone(chiusi).completo).toBe(true)
  })

  it('conta i cani distinti toelettati in questo mese', () => {
    const ora = new Date(2026, 9, 26)
    const visite = [
      { status: 'completato', start: new Date(2026, 9, 2), dogId: 'a' },
      { status: 'completato', start: new Date(2026, 9, 3), dogId: 'a' },
      { status: 'completato', start: new Date(2026, 9, 4), dogId: 'b' },
      { status: 'programmato', start: new Date(2026, 9, 5), dogId: 'c' },
      { status: 'completato', start: new Date(2026, 8, 5), dogId: 'd' },
      { status: 'completato', start: new Date(2026, 9, 6), dogId: 'e' },
    ]
    expect(caniToelettatiNelMese(visite, { e: 'gatto', b: 'cane' }, ora)).toBe(2)
  })

  it('accetta ELIMINA o il nome esatto del salone', () => {
    expect(confermaEliminaValida('ELIMINA', 'Bauci')).toBe(true)
    expect(confermaEliminaValida('  Bauci  ', 'Bauci')).toBe(true)
    expect(confermaEliminaValida('bauci', 'Bauci')).toBe(false)
    expect(confermaEliminaValida('ELIMINA ', '')).toBe(true)
    expect(confermaEliminaValida('', '')).toBe(false)
  })

  it('protegge Laura, il salone shared e il titolare VIP', () => {
    expect(accountNonEliminabile({ email: 'laura.masala@tiscali.it', salonId: 'laura', uid: 'laura' })).toBe(true)
    expect(accountNonEliminabile({ email: 'ada@salone.it', salonId: 'shared', uid: 'ada' })).toBe(true)
    expect(accountNonEliminabile({ email: 'ada@salone.it', salonId: 'ada', uid: 'ada', vip: true })).toBe(true)
    expect(accountNonEliminabile({ email: 'ada@salone.it', salonId: 'titolare', uid: 'ada', vip: true })).toBe(false)
    expect(accountNonEliminabile({ email: 'ada@salone.it', salonId: 'ada', uid: 'ada', vip: false })).toBe(false)
  })

  it('tiene nascosto l’invito e riconosce il dispositivo', () => {
    expect(MOSTRA_INVITO_COLLEGA).toBe(false)
    expect(etichettaDispositivo('Mozilla Android SM-S938B')).toBe('SM-S938B')
    expect(etichettaDispositivo('iPhone')).toBe('iPhone')
  })
})
