// Frasi che restano nel codice di proposito: sono valori salvati o nomi fissi, non testi da leggere.

export const FRASI_AMMESSE: Record<string, readonly string[]> = {
  // Valore iniziale salvato nelle impostazioni, nessuna schermata lo mostra.
  'src/data/local/settings.ts': ['Specie', 'Razza', 'Sesso', 'Peso', 'Taglia', 'Cliente', 'Durata media'],
  // Il codice confronta la parola fissa, in tutte le lingue (T2 e T3).
  'src/lib/confermaElimina.ts': ['ELIMINA'],
  // Codici di stato delle righe: in pagina passano da `frasiReport` e dal catalogo. `Cane` è solo il valore di riserva.
  'src/lib/earnings.ts': ['Cane', 'non venuto', 'da chiudere', 'disdetto dal cliente'],
  // Segno salvato sulla visita: in pagina si legge con `notaVisibile`.
  'src/lib/fedelta.ts': ['Premio fedeltà'],
  // Nome salvato sulla visita: in pagina si legge con `nomeServizioVisibile`.
  'src/lib/pianoRichiesta.ts': ['Toelettatura'],
  // Valori salvati: in pagina si legge `etichettaRuolo`.
  'src/lib/ruoloProprietario.ts': ['Proprietario', 'Proprietaria', 'Co-proprietario', 'Figlio', 'Figlia', 'Amico', 'Amica'],
  // Nomi proposti per le voci nuove: si salvano così e in pagina si leggono con `nomeVoceListino`.
  'src/pages/PriceSheetManagePage.tsx': ['Bagno', 'Bagno + sistemazione', 'Pelo corto', 'Pelo lungo'],
  // Il messaggio italiano accanto al codice, per le APK già installate.
  'functions/src/piano/silenzioEmail.ts': ['Cane assente'],
  // Messaggi per chi lancia scripts/imposta-admin.ts: nessuna schermata li mostra.
  'src/lib/passaggioAdmin.ts': ['Il salone di Laura non è il suo uid: trovato ${stato.lauraSalonId ?? \'niente\'}.', 'robmass83 non è collegato al salone di Laura.'],
  // Nomi già salvati sui prodotti del vecchio catalogo: servono solo a riconoscerli.
  'src/lib/catalogoProdotti.ts': ['Disinfettante per attrezzi', 'Lame per tosatrice', 'Olio per tosatrice', 'Spray refrigerante lame'],
  // Nome di prodotto, uguale in tutte le lingue.
  'src/components/admin/AdminFrame.tsx': ['Groomly Admin'],
  // Nomi su Drive: la conservazione delle copie in Android cerca questo prefisso e il registro si sovrascrive per nome.
  'src/lib/backupCompleto.ts': ['Groomly Backup completo – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip'],
  'src/lib/backupZip.ts': ['Groomly Backup – ${nomeSicuro(nomeSalone(raccolto.manifest))} – ${romeDay(now)}.zip'],
  'src/lib/driveRipristino.ts': ['Groomly Backup – ${nomeSicuro(nome.trim() || \'Groomly\')}'],
}
