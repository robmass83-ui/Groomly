import { describe, expect, it } from 'vitest'
import type { InvitoBeta } from './betaInvito'
import { faseBeta } from './faseBeta'
import { statoPiano, type ProMain } from './piano'

const GIORNO = 24 * 60 * 60 * 1000
const adesso = new Date('2026-11-04T10:00:00.000Z')
const tra = (giorni: number) => new Date(adesso.getTime() + giorni * GIORNO).toISOString()

function invito(campi: Partial<InvitoBeta> = {}): InvitoBeta {
  return {
    salonId: 's1',
    piano: 'pro',
    giorni: 30,
    messaggio: null,
    stato: 'invitato',
    invitatoIl: tra(-1),
    scadeInvitoIl: tra(13),
    rispostoIl: null,
    motivoRifiuto: null,
    altroRifiuto: null,
    revocatoIl: null,
    invitatoDa: 'op@groomly.app',
    aggiornatoIl: tra(-1),
    ...campi,
  }
}

function fase(input: { invito?: InvitoBeta | null; pro?: ProMain; quando?: Date }) {
  const quando = input.quando ?? adesso
  return faseBeta({ invito: input.invito ?? null, stato: statoPiano(input.pro, quando), traccia: input.pro ?? {}, adesso: quando })
}

const inBeta = (giorni: number, extra: ProMain = {}): ProMain => ({
  piano: 'pro', stato: 'attivo', fonte: 'beta', scadeIl: tra(giorni), exBeta: true, betaPiano: 'pro', betaDal: tra(giorni - 30), betaFinoAl: tra(giorni), ...extra,
})

describe('faseBeta', () => {
  it('senza invito e senza traccia è nessuna', () => {
    const beta = fase({})
    expect(beta.fase).toBe('nessuna')
    expect(beta.feedbackVisibile).toBe(false)
    expect(beta.domandaFine).toBe(false)
  })

  it('invito aperto e valido', () => {
    const beta = fase({ invito: invito() })
    expect(beta.fase).toBe('invitato')
    expect(beta.invitoValido).toBe(true)
    expect(beta.piano).toBe('pro')
    expect(beta.giorniInvito).toBe(30)
  })

  it("un invito scaduto da un millisecondo non vale più, anche se il server non l'ha ancora segnato", () => {
    const beta = fase({ invito: invito({ scadeInvitoIl: new Date(adesso.getTime() - 1).toISOString() }) })
    expect(beta.fase).toBe('nessuna')
    expect(beta.invitoValido).toBe(false)
    expect(beta.invito?.stato).toBe('invitato')
  })

  it('beta in corso: giorni rimasti, totali e riga feedback', () => {
    const beta = fase({ pro: inBeta(10), invito: invito({ stato: 'accettato' }) })
    expect(beta.fase).toBe('in-corso')
    expect(beta.giorniRimasti).toBe(10)
    expect(beta.giorniTotali).toBe(30)
    expect(beta.feedbackVisibile).toBe(true)
    expect(beta.domandaFine).toBe(false)
  })

  it("all'ultimo giorno compare la domanda di fine", () => {
    expect(fase({ pro: inBeta(1) }).domandaFine).toBe(true)
  })

  it('un salone Salon in beta ha il piano salone', () => {
    expect(fase({ pro: inBeta(5, { piano: 'salone', betaPiano: 'salone', seatsIncluded: 3 }) }).piano).toBe('salone')
  })

  it('beta finita da 3 giorni: domanda di fine e riga feedback', () => {
    const beta = fase({ pro: { piano: 'base', stato: 'scaduto', exBeta: true, betaPiano: 'salone', betaDal: tra(-33), betaFinoAl: tra(-3) } })
    expect(beta.fase).toBe('finita')
    expect(beta.piano).toBe('salone')
    expect(beta.domandaFine).toBe(true)
    expect(beta.feedbackVisibile).toBe(true)
  })

  it('dopo 31 giorni dalla fine la riga feedback e la domanda spariscono', () => {
    const beta = fase({ pro: { stato: 'scaduto', exBeta: true, betaPiano: 'pro', betaDal: tra(-61), betaFinoAl: tra(-31) } })
    expect(beta.fase).toBe('finita')
    expect(beta.feedbackVisibile).toBe(false)
    expect(beta.domandaFine).toBe(false)
  })

  it('dopo una revoca niente domanda di fine, e i 30 giorni partono dalla revoca', () => {
    const beta = fase({
      pro: { stato: 'scaduto', exBeta: true, betaPiano: 'pro', betaDal: tra(-10), betaFinoAl: tra(20) },
      invito: invito({ stato: 'revocato', revocatoIl: tra(-2) }),
    })
    expect(beta.fase).toBe('finita')
    expect(beta.revocata).toBe(true)
    expect(beta.domandaFine).toBe(false)
    expect(beta.fine?.toISOString()).toBe(tra(-2))
    expect(beta.feedbackVisibile).toBe(true)
  })

  it('un ex beta invitato di nuovo vede il nuovo invito', () => {
    const beta = fase({ pro: { stato: 'scaduto', exBeta: true, betaFinoAl: tra(-40) }, invito: invito() })
    expect(beta.fase).toBe('invitato')
  })

  it('senza betaDal la barra non ha totali ma la beta resta leggibile', () => {
    const beta = fase({ pro: inBeta(10, { betaDal: undefined }) })
    expect(beta.fase).toBe('in-corso')
    expect(beta.giorniRimasti).toBe(10)
    expect(beta.giorniTotali).toBeNull()
  })

  it("senza betaDal ma con l'invito accettato i totali sono i giorni dell'invito", () => {
    expect(fase({ pro: inBeta(10, { betaDal: undefined }), invito: invito({ stato: 'accettato', giorni: 45 }) }).giorniTotali).toBe(45)
  })

  it('early adopter dalla traccia', () => {
    expect(fase({ pro: inBeta(10, { earlyAdopter: true }) }).earlyAdopter).toBe(true)
  })

  it('un piano manuale non è beta', () => {
    expect(fase({ pro: { piano: 'pro', stato: 'attivo', fonte: 'manuale' } }).fase).toBe('nessuna')
  })
})
