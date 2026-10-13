# Groomly — Listino: «Aggiungi file» in alto a destra e occhio sul file

Data: 2026-10-13  
Stato: design approvato in chat (approccio 1, occhio solo indizio); in attesa della lettura di questo file.

Modifica solo UI della card file in `ListinoPage`. Nessun cambio a salvataggio, route o modello dati.

## 0. Decisioni

| # | Regola |
|---|---|
| U1 | «Aggiungi file» sta in alto a destra nella card, non sotto l’elenco. |
| U2 | Accanto al nome file c’è un’icona occhio solo come indizio; non è un bottone nuovo. |
| U3 | Aprire il file resta il click sul link del nome (come oggi, verso `/listino/vedi?id=…`). |
| U4 | Matita (rinomina) e cestino restano com’è. |

## 1. Layout card file

Nella `Card` in cima a Listino prezzi:

1. **Riga azione** in cima: `display: flex`, `justify-content: flex-end` (o `space-between` se serve uno spazio a sinistra), padding come l’attuale barra del bottone. Contiene solo `Button size="sm"` «Aggiungi file» che apre l’`input` file nascosto già presente.
2. **Sotto**: stato vuoto («Nessun file») oppure le righe file esistenti.

Con zero file il bottone resta comunque in alto a destra; sotto compare «Nessun file».

## 2. Occhio sulla riga

Nel link del `fileName` (non come `IconButton` separato):

- dopo il testo del nome, icona Lucide `Eye` (~14px, `strokeWidth={2}`, `aria-hidden`);
- colore soft (`var(--tx3)` o equivalente già usato per meta);
- gap piccolo tra nome e occhio;
- l’intero link (nome + occhio) punta a `/listino/vedi?id=…` come oggi.

In rinomina (input attivo) l’occhio non compare; restano solo campo nome e azioni.

## 3. Fuori scope

- Rendere cliccabile tutta la riga (meta, padding).
- Nuovo tap target sull’occhio distinto dal link.
- Cambi a `PriceViewPage`, upload, limiti file, Firestore.

## 4. Verifica

- Test esistenti su «Aggiungi file» e link nome restano validi.
- Opzionale: assert che nella riga con file ci sia un’icona occhio (es. via `aria-hidden` / presenza nel link), senza introdurre un ruolo bottone.
