// Il pacchetto @revenuecat/purchases-capacitor si aggiunge il giorno del Play Store.
// Con gli abbonamenti spenti non si carica nessuno script dello store.

export function compra(abbonamentiAttivi: boolean, caricaStore: () => void = () => undefined): { stato: 'spento' } | { stato: 'pronto' } {
  if (!abbonamentiAttivi) return { stato: 'spento' }
  caricaStore()
  return { stato: 'pronto' }
}

export function sondaggioDisdettaVisibile(abbonamentiAttivi: boolean): boolean {
  return abbonamentiAttivi
}
