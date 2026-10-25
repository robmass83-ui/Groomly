# Groomly – Nuova bottom navigation bar

Ridisegna **solo** la bottom navigation bar dell'app. Non modificare nient'altro (schermate, header, liste, colori globali, font, routing). Il file di riferimento allegato `groomly-bottom-bar.html` contiene la barra finita: replicala fedelmente nel nostro stack, riusando gli SVG così come sono.

## Struttura

- 5 tab di uguale larghezza, in quest'ordine: **Home, Animali, Agenda, Listino, Altro**.
  - "Agenda" è la tab che oggi si chiama "Calendario": cambia solo l'etichetta, la rotta resta la stessa.
- Un bottone **"+"** circolare centrato orizzontalmente, che galleggia sopra la tab Agenda.
- Rimuovi il vecchio bottone "+" centrale che copriva l'icona del Calendario.

## Barra

- Flottante, staccata dai bordi: `left: 12px`, `right: 12px`, `bottom: 12px + safe-area-inset-bottom`.
- Altezza 72px, padding `12px 4px 9px`, `border-radius: 24px`.
- Sfondo sfumato verticale:
  - chiaro: `#ffffff → #f3f6fb`
  - scuro: `#232c40 → #1a2132`
- Ombra:
  - chiaro: `inset 0 1px 0 #fff, 0 12px 28px rgba(28,42,68,.14), 0 2px 6px rgba(28,42,68,.06)`
  - scuro: `inset 0 1px 0 rgba(255,255,255,.06), 0 12px 28px rgba(0,0,0,.45)`
- Nessun bordo, nessun incavo.

## Tab

- Colonna: icona dentro un riquadro 38×38px (`border-radius: 13px`), sotto l'etichetta 11px, gap 5px. Le etichette non vanno mai a capo.
- Icone: SVG a linea (stroke), 22px, `stroke-width: 1.7`, `stroke-linecap/linejoin: round`, `fill: none`, colore `currentColor`. Usa esattamente gli SVG del file HTML di riferimento.
- **Inattiva**: icona ed etichetta grigie (`#8a95a8` chiaro, `#6f7a91` scuro), riquadro trasparente. Nessun colore.
- **Attiva** (solo la sezione in cui si trova l'utente):
  - riquadro con sfumatura `linear-gradient(135deg, #4f9dff, #2457d6)`
  - icona bianca, `stroke-width: 2`
  - ombra tessera: `0 5px 12px rgba(36,87,214,.42), inset 0 1px 0 rgba(255,255,255,.4)` (scuro: `0 5px 14px rgba(56,120,255,.5), inset 0 1px 0 rgba(255,255,255,.35)`)
  - etichetta `#185fa5` (scuro `#8fc0ff`), peso 600
- La tab attiva deriva dalla rotta corrente (anche aprendo una sotto-pagina, es. profilo cane → resta attiva Animali).
- Transizioni 200ms su colore, sfondo e ombra. Al tocco: `scale(0.92)` sul riquadro.
- Area di tocco minima 44×44px. Accessibilità: `aria-current="page"` (o equivalente) sulla tab attiva.

## Bottone "+"

- Cerchio 60px, nessun bordo, icona "+" bianca 26px (`stroke-width: 2.6`).
- Sfondo `radial-gradient(circle at 30% 25%, #5aa2ff 0%, #185fa5 70%)`.
- Ombra `inset 0 1px 0 rgba(255,255,255,.35), 0 10px 22px rgba(24,95,165,.45)`.
- Posizione: centrato orizzontalmente, `top: -48px` rispetto alla barra, così si sovrappone appena al bordo superiore e si ferma subito sopra l'icona di Agenda, che resta completamente visibile.
- Al tocco `scale(0.92)`; mentre il menu rapido è aperto l'icona ruota di 45°.
- Mantiene l'azione attuale (menu di aggiunta rapida).
- `aria-label="Aggiungi"`.

## Contenuto delle schermate

- Aggiungi in fondo a ogni schermata scrollabile un padding pari a `altezza barra + 56px + safe-area-inset-bottom`, così l'ultimo elemento non finisce sotto barra o bottone.

## Tema

- Supporta chiaro e scuro seguendo il tema già usato dall'app (stessi valori indicati sopra).

## Verifica

- Prova su schermo largo 360px e 430px: 5 etichette su una riga, "+" centrato, icona Agenda visibile.
- Prova con il notch/gesture bar di Android e iOS (safe area).
- Controlla che nessun'altra parte dell'interfaccia sia cambiata.
