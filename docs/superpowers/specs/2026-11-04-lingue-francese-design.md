# Lingue T2: francese

Parte di `2026-11-04-cinque-lingue-design.md`. Il compito era già definito, quindi niente brainstorm esteso né piano a parte.

## Fatto

`src/i18n/fr.ts`: 1.965 chiavi, nello stesso ordine di `it.ts`, con la struttura di `en.ts`. Non è collegato all'app: `Lingua` e `t.ts` li cambia T1.

## Scelte

- Spazio insecabile U+00A0 prima di `: ; ? ! % €` e dentro « ». Niente U+202F: non è detto che i font dell'app e dei PDF lo abbiano.
- Le parole di conferma seguono il codice. `ELIMINA` e `ACCENDI` restano in italiano perché `confermaElimina.ts` e `PAROLA_ACCENDI` delle functions le confrontano fisse. `SUPPRIMER` e `REMPLACER` si traducono perché il confronto usa il catalogo.
- `ivaIT` e `ivaES` restano nella forma del loro paese, come in inglese.
- Dopo `de` il mese cambierebbe forma (*d'avril*): le frasi con `{{mese}}` e `{{when}}` usano i due punti o le parentesi. Con `{{nome}}` si accetta `de`: l'alternativa peggiora ogni frase.
- Le frasi su un animale evitano il genere quando costa poco (*Fiche de {{nome}} enregistrée*).

## Da controllare in T7

- A 320 px: i pulsanti affiancati con *Enregistrer quand même* e *Se déconnecter quand même* vanno su due righe. `Button` e `Segmented` lo permettono.
- `euro()` e le date in `format.ts` li fa T1.
