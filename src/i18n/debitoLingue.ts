// Il lavoro che l'ondata 2 deve ancora fare. Quando è finito, questi elenchi sono vuoti.

/** Da mettere a false a fine ondata 2: nessun `// LINGUE: da tradurre` potrà più restare. */
export const SEGNAPOSTO_AMMESSI = true

/** File con catene di confronti sulla lingua in cui francese e tedesco cadono sull'italiano. */
export const DEBITO_CATENE = [
  'functions/src/piano/emailEliminazione.ts',
  'functions/src/piano/gestisciPrenotazione.ts',
  'functions/src/piano/rispondiRichiesta.ts',
  'src/components/piano/RiquadroRichiesta.tsx',
  'src/i18n/emailHtml.ts',
  'src/lib/htmlEsito.ts',
  'src/lib/messaggiManuali.ts',
]

/** Frasi `fr` e `de` che restano uguali a `en` o `it` di proposito. */
export const FRASI_UGUALI = new Set<string>([
  'Backup', 'Email', 'Go', 'Google', 'Groomly', 'Plus', 'Salon', 'VIP', 'WhatsApp',
])
