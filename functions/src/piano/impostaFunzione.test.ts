import { describe, expect, it } from 'vitest'
import { impostaFunzionePer } from './impostaFunzione'
import { impostaPianoManualePer } from './impostaPianoManuale'

describe('operatore nelle functions', () => {
  it('rifiuta Laura e Roberto se l’email non è verificata e non c’è il claim admin', async () => {
    await expect(impostaFunzionePer({
      operatorEmail: 'laura.masala@tiscali.it',
      emailVerified: false,
      salonId: 'salone',
      chiave: 'scheda',
      acceso: true,
    })).rejects.toThrow('Accesso negato')
    await expect(impostaPianoManualePer({
      operatorEmail: 'masala.roberto@hotmail.it',
      salonId: 'salone',
      azione: 'pro',
    })).rejects.toThrow('Accesso negato')
  })
})
