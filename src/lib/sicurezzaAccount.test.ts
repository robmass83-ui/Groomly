import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const index = readFileSync('functions/src/index.ts', 'utf8')

function corpo(nome: string): string {
  const inizio = index.indexOf(`export const ${nome} `)
  expect(inizio, nome).toBeGreaterThan(-1)
  const fine = index.indexOf('\nexport const ', inizio + 10)
  return index.slice(inizio, fine === -1 ? undefined : fine)
}

describe('account e sessioni: i controlli stanno sul server', () => {
  it('eliminare l’account vuole un accesso di pochi minuti fa, non solo la password chiesta dall’app', () => {
    const elimina = corpo('eliminaAccount')
    expect(elimina).toContain('controllaAccessoRecente(request.auth?.token.auth_time)')
    expect(elimina.indexOf('controllaAccessoRecente')).toBeLessThan(elimina.indexOf('eliminaAccountPer'))
    const pagina = readFileSync('src/pages/EliminaAccountPage.tsx', 'utf8')
    expect(pagina).toContain('riconfermaPassword(password)')
    expect(pagina).toContain("'riconferma_richiesta'")
  })

  it('senza email confermata, o account di prima, niente link pubblico, prova, inviti o telefono per le push', () => {
    for (const nome of ['pubblicaSalone', 'avviaProva', 'createInvite', 'prendiPushTelefono']) {
      expect(corpo(nome), nome).toContain('richiediEmailConfermata(uid, request.auth?.token)')
    }
    expect(corpo('slugSalone')).toContain('titolareConfermato(event.params.salonId)')
    expect(index).toMatch(/async function richiediEmailConfermata[\s\S]*?indirizziAmmessi\(uid, token\?\.email_verified === true\)[\s\S]*?email_non_confermata/)
  })

  it('la pagina /azione/ conferma solo con un tocco e gestisce il cambio email e il suo annullamento', () => {
    const azione = readFileSync('hosting/azione/index.html', 'utf8')
    expect(azione).toContain("['resetPassword', 'verifyEmail', 'verifyAndChangeEmail', 'recoverEmail'].includes(mode)")
    const ramo = azione.slice(azione.indexOf("if (mode === 'verifyEmail' || mode === 'verifyAndChangeEmail'"))
    expect(ramo.indexOf('checkActionCode')).toBeGreaterThan(-1)
    // Aprire il link non applica il codice: applyActionCode sta solo dentro il tocco del pulsante.
    const mostra = azione.slice(azione.indexOf('function showActionCode'), azione.indexOf('window.setTimeout'))
    expect(mostra.indexOf("addEventListener('click'")).toBeLessThan(mostra.indexOf('applyActionCode'))
    expect(azione.split('applyActionCode').length - 1).toBe(1)
    for (const chiave of ['confirmBtn', 'changeBtn', 'recoverBtn', 'resetBtn']) {
      expect(azione.split(`${chiave}:`).length - 1, chiave).toBe(5)
    }
  })
})
