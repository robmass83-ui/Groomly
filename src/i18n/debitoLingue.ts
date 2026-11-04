// Il lavoro che l'ondata 2 deve ancora fare. Quando è finito, questi elenchi sono vuoti.

/** Da mettere a false a fine ondata 2: nessun `// LINGUE: da tradurre` potrà più restare. */
export const SEGNAPOSTO_AMMESSI = true

/** File con catene di confronti sulla lingua in cui francese e tedesco cadono sull'italiano. */
export const DEBITO_CATENE = [
  'src/components/piano/RiquadroRichiesta.tsx',
  'src/lib/messaggiManuali.ts',
]

/** Frasi `fr` e `de` che restano uguali a `en` o `it` di proposito: parole identiche nelle due lingue e nomi. */
export const FRASI_UGUALI: Record<'fr' | 'de', ReadonlySet<string>> = {
  fr: new Set([
    '{{mese}}', 'Confirmation', 'Messages', 'Agenda', 'OK', 'Client', 'Salon', 'Photo', 'Grande', 'Contact',
    'Menu', 'Notes', 'Contacts', 'Note', 'Type', 'Principale', 'Active', 'grande', 'Date', 'Minutes',
    '{{n}} min', 'Total', 'Style', 'animal', 'Auto', 'Notifications', 'DPA', 'Type {{nome}}', 'Logo', 'Image',
    '1 page', '{{n}} pages', 'JPEG (image)', 'Plus', 'VIP', 'Suggestions', 'Important', 'Maintenance', 'App',
    'Groomly', 'ELIMINA', 'Version', 'Build {{versione}}', 'Base', 'Go', 'Mode', 'PDF', 'Excel', 'Suggestion',
    'Groomly Go', 'Groomly Plus', 'Groomly Salon', 'Groomly VIP', 'Partita IVA', 'NIF / CIF', 'Numéro de TVA',
    'Format', 'Description', 'Admin Manager', 'Sections', 'Salons', 'Sources', 'Play',
    '{{plus}} Plus · {{salone}} Salon', '{{n}} salons', '1 salon', '{{n}}/{{max}}', 'Actions', 'Early adopter',
    'Plus {{n}}', 'Salon {{n}}', '{{n}} utile', 'RevenueCat', 'Utile', 'ACCENDI',
  ]),
  de: new Set([
    '{{mese}}', 'Team', 'OK', 'Salon', 'Status', 'Adult', 'Senior', 'Foto', 'Name', 'Extra', 'Filter', 'Auto',
    'Info', 'Logo', 'Backup', 'Updates', 'Plus', 'VIP', 'Update', 'App', 'Groomly', 'ELIMINA', 'Version',
    'Website', 'Build {{versione}}', 'Base', 'Go', 'Salons', 'PDF', 'Excel', 'Groomly Go', 'Groomly Plus',
    'Groomly Salon', 'Groomly VIP', 'Partita IVA', 'NIF / CIF', 'Numéro de TVA', 'Format', 'Admin Manager',
    'Beta', 'Feedback', 'Play', '{{plus}} Plus · {{salone}} Salon', 'Beta Plus', 'Beta Salon', '{{n}}/{{max}}',
    'Feedback: {{n}}', 'Feedback {{n}}', 'Plus {{n}}', 'Salon {{n}}', '5–10 €', '10–20 €', 'RevenueCat',
    'Optional', 'ACCENDI',
  ]),
}
