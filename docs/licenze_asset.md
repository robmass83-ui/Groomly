# Licenze di immagini, icone e font

Aggiornato il 5/11/2026. L'origine di loghi e icone è dichiarata dall'utente: sono stati fatti da lui o creati su sua richiesta con Claude o Cursor. Nel progetto non ci sono altre prove scritte di questa origine.

| Asset | Dove | Origine | Licenza | Uso commerciale |
|---|---|---|---|---|
| Loghi Groomly, Plus, Salon, VIP | `src/assets/brand/` (22 file), `Icon and logo/`, `hosting/groomly-logo-*`, `public/groomly-icon.svg` | Opera propria del progetto | Tutti i diritti riservati a Groomly | Sì |
| Icone sticker e illustrazioni (cani, servizi, carattere, contanti, POS) | `src/assets/icons/svg/` (27 file), `Icon and logo/icone2/` | Opera propria del progetto | Tutti i diritti riservati a Groomly | Sì |
| Grafica per Google Play | `Icon and logo/play-store/` | Opera propria del progetto | Tutti i diritti riservati a Groomly | Sì |
| Icone di interfaccia | Pacchetto `lucide-react` | Lucide | ISC | Sì |
| Font Inter, Poppins, Quicksand, Oswald, Dancing Script | Pacchetti `@fontsource/*` | Google Fonts | SIL OFL 1.1 | Sì |

## Pacchetti

L'elenco completo con le licenze sta in `src/data/licenze.json` e si vede in Impostazioni › Legale › Licenze open source. Si rigenera con `npm run licenze`; un test avvisa se resta indietro.

- Nessuna dipendenza impone GPL o AGPL.
- `jszip` offre MIT o GPL: si usa con MIT.
- `dompurify` offre MPL o Apache: si usa con Apache-2.0.
- `limiter@1.1.5`: licenza MIT, indicata nel suo `package.json`.
- `buffers@0.1.1` (arriva da `exceljs`): il pacchetto non dichiara una licenza, né nel `package.json` né in un file. Nell'elenco risulta «da verificare». Si può chiedere all'autore o sostituire la dipendenza se `exceljs` la toglie.

## Da controllare a mano

- Se qualche asset è stato preso da siti di icone o generatori di immagini diversi da quelli dichiarati, va aggiunto qui con la sua licenza.
- Le librerie Android che Capacitor aggiunge in fase di build non sono in questo elenco.
