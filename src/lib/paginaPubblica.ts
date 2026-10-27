import { orariCompilati, type Fascia, type Giorno, type OrariSettimana } from './orari'
import { specieAccettate, type SpeciePrenotabile } from './prenotazionePubblica'
import { logoSicuro } from './logoPubblico'

export type LinguaPagina = 'it' | 'en' | 'es'
export type LogoFormaPagina = 'tondo' | 'quadrato'

const GIORNI: Record<LinguaPagina, readonly string[]> = {
  it: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
}

const COPY: Record<LinguaPagina, { prenota: string; gestito: string; privacy: string; lingue: string; spento: string }> = {
  it: { prenota: 'Prenota un appuntamento', gestito: 'Gestito con', privacy: 'Privacy', lingue: 'Lingua', spento: 'Questo salone non accetta prenotazioni online.' },
  en: { prenota: 'Book an appointment', gestito: 'Run with', privacy: 'Privacy', lingue: 'Language', spento: 'This salon is not taking online bookings.' },
  es: { prenota: 'Reserva una cita', gestito: 'Gestionado con', privacy: 'Privacidad', lingue: 'Idioma', spento: 'Este salón no acepta reservas online.' },
}

function firmaFasce(fasce: unknown): string {
  if (!Array.isArray(fasce)) return ''
  return fasce.flatMap((fascia) => {
    if (!fascia || typeof fascia !== 'object') return []
    const da = (fascia as Fascia).da
    const a = (fascia as Fascia).a
    if (typeof da !== 'string' || typeof a !== 'string' || !/^\d{2}:\d{2}$/.test(da) || !/^\d{2}:\d{2}$/.test(a)) return []
    return [`${da}–${a}`]
  }).join(', ')
}

/** Righe compatte degli orari di apertura, da lunedì. I giorni chiusi non compaiono. */
export function testoOrari(orari: unknown, lang: LinguaPagina): string {
  if (!orari || typeof orari !== 'object' || Array.isArray(orari) || !orariCompilati(orari as OrariSettimana)) return ''
  const nomi = GIORNI[lang]
  const gruppi: { da: number; a: number; testo: string }[] = []
  for (let passo = 1; passo <= 7; passo += 1) {
    const giorno = (passo % 7) as Giorno
    const testo = firmaFasce((orari as OrariSettimana)[giorno])
    if (!testo) continue
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo && ultimo.testo === testo && ultimo.a === passo - 1) ultimo.a = passo
    else gruppi.push({ da: passo, a: passo, testo })
  }
  const nome = (passo: number) => nomi[passo % 7]
  return gruppi.map((gruppo) => (
    gruppo.da === gruppo.a ? `${nome(gruppo.da)} ${gruppo.testo}` : `${nome(gruppo.da)}–${nome(gruppo.a)} ${gruppo.testo}`
  )).join(' · ')
}

export function htmlPaginaPubblica(input: {
  lang: LinguaPagina
  nome: string
  indirizzo: string
  telefono: string
  descrizione?: string
  orari?: string
  prenotabile: boolean
  salonId: string
  vat?: string
  logo?: string
  logoForma?: LogoFormaPagina
  specie?: readonly SpeciePrenotabile[]
}): string {
  const copia = COPY[input.lang]
  const nome = esc(input.nome)
  const descrizione = (input.descrizione ?? '').replace(/\s+/g, ' ').trim().slice(0, 240)
  const orari = (input.orari ?? '').trim()
  const logo = logoSicuro(input.logo)
  const forma = input.logoForma === 'tondo' ? 'tondo' : 'quadrato'
  const testoOg = esc(descrizione || input.indirizzo || copia.prenota)
  const profilo = JSON.stringify({
    lang: input.lang,
    nome: input.nome,
    indirizzo: input.indirizzo,
    telefono: input.telefono,
    descrizione,
    orari,
    prenotabile: input.prenotabile,
    salonId: input.salonId,
    logo,
    logoForma: forma,
    specie: specieAccettate(input.specie),
  }).replace(/</g, '\\u003c')
  const iniziale = esc(inizialeDi(input.nome))
  const marchio = logo
    ? `<img class="marchio marchio-${forma}" src="${esc(logo)}" alt="">`
    : `<span class="marchio monogramma" aria-hidden="true">${iniziale}</span>`
  const contatti = [
    input.indirizzo ? `<li><a href="${esc(mapsHref(input.indirizzo))}">${esc(input.indirizzo)}</a></li>` : '',
    input.telefono ? `<li><a href="${esc(telHref(input.telefono))}">${esc(input.telefono)}</a></li>` : '',
  ].filter(Boolean).join('')
  return `<!DOCTYPE html><html lang="${input.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#eef3f7"><title>${nome}</title><meta name="description" content="${testoOg}"><meta property="og:title" content="${nome}"><meta property="og:description" content="${testoOg}"><style>${CSS}</style></head><body><header><nav class="lingue" aria-label="${esc(copia.lingue)}">${linkLingua('it', 'Italiano', input.lang)} · ${linkLingua('en', 'English', input.lang)} · ${linkLingua('es', 'Español', input.lang)}</nav><a class="marca" href="/"><img src="/groomly-logo-orizzontale.svg" alt="Groomly" width="437" height="120"></a></header><main><article class="scheda scheda-salone"><div class="identita">${marchio}<div><p class="kicker">${esc(copia.prenota)}</p><h1>${nome}</h1>${contatti ? `<ul class="contatti">${contatti}</ul>` : ''}${descrizione ? `<p class="muto">${esc(descrizione)}</p>` : ''}${orari ? `<p class="orari">${esc(orari)}</p>` : ''}</div></div></article><section id="prenota" class="scheda"></section></main><footer><p>${esc(copia.gestito)} <a href="/">Groomly</a> · <a href="/privacy/?lang=${input.lang}">${esc(copia.privacy)}</a></p></footer><script type="application/json" id="profilo">${profilo}</script><script src="/s/pagina.js" defer></script></body></html>`
}

function linkLingua(codice: LinguaPagina, etichetta: string, attiva: LinguaPagina): string {
  const corrente = codice === attiva ? ' aria-current="page"' : ''
  return `<a href="?lang=${codice}" hreflang="${codice}" lang="${codice}"${corrente}>${etichetta}</a>`
}

function inizialeDi(nome: string): string {
  const lettera = nome.trim().charAt(0)
  return lettera ? lettera.toLocaleUpperCase('it') : 'G'
}

function telHref(telefono: string): string {
  const pulito = telefono.replace(/[^\d+]/g, '')
  return pulito ? `tel:${pulito}` : ''
}

function mapsHref(indirizzo: string): string {
  return `https://maps.google.com/?q=${encodeURIComponent(indirizzo)}`
}

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
}

const CSS = `:root{color-scheme:light;--bg:#eef3f7;--card:#fff;--ink:#2C4560;--muted:#5C6B7C;--line:#dfe8ef;--link:#1A6490;--pri:#2C4560;--soft:#E7F2F8;--bad:#9E2F2A;--ok:#1F6B45}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Segoe UI",system-ui,sans-serif}header,footer,main{max-width:720px;margin:0 auto;padding-left:12px;padding-right:12px}header{padding-top:28px}footer{padding-bottom:calc(28px + env(safe-area-inset-bottom));color:var(--muted);font-size:14px}footer a,nav.lingue a,.contatti a{color:var(--link)}nav.lingue{font-size:14px;margin:0 0 12px}nav.lingue a[aria-current="page"]{color:var(--ink);font-weight:700;text-decoration:none}header img{height:40px;width:auto}main{display:grid;gap:16px;padding-top:20px;padding-bottom:20px}.scheda{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 12px}.identita{display:flex;gap:16px;align-items:flex-start}.marchio{width:72px;height:72px;flex:none}.marchio-quadrato{border-radius:16px;object-fit:contain;background:var(--soft);border:1px solid var(--line)}.marchio-tondo{border-radius:50%;object-fit:cover;background:var(--soft);border:1px solid var(--line)}.monogramma{display:grid;place-items:center;border-radius:16px;background:var(--soft);color:var(--pri);font-weight:700;font-size:28px}h1{margin:0;font-size:28px;line-height:1.2}.kicker{margin:0 0 4px;color:var(--link);font-size:14px;font-weight:700}.contatti{list-style:none;padding:0;margin:8px 0 0}.contatti li{margin:2px 0}.contatti a{text-decoration:none}.contatti a:hover{text-decoration:underline}.muto,.orari{color:var(--muted);margin:8px 0 0}.orari{color:var(--ink)}h2{margin:0 0 4px;font-size:22px;line-height:1.25}fieldset{border:0;margin:0;padding:0;min-inline-size:0}legend{font-weight:700;padding:0;margin:0 0 8px}ol.passi{display:flex;flex-wrap:wrap;gap:8px 12px;list-style:none;padding:0;margin:0 0 16px}ol.passi li{display:inline-flex;align-items:center;gap:6px;min-height:32px;color:var(--muted);font-size:14px}ol.passi li[aria-current="step"],ol.passi li.fatto{color:var(--ink);font-weight:700}ol.passi .n{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--soft);font-size:12px;font-weight:700}ol.passi li[aria-current="step"] .n,ol.passi li.fatto .n{background:var(--pri);color:#fff}.scelte{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.scelta{min-height:88px;border:1px solid var(--line);background:#fff;border-radius:12px;color:var(--ink);font:inherit;font-weight:700;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:8px;cursor:pointer}.taglie .scelta{min-height:48px}.specie .scelta{min-height:48px;flex-direction:row;gap:6px;padding:4px 8px}.specie .scelta svg{width:24px;height:24px;flex:none}.scelta[aria-pressed="true"]{background:var(--pri);color:#fff;border-color:var(--pri)}.scelta:hover{border-color:var(--pri)}.scelta svg{display:block}.riepilogo{display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:48px}.testo{margin:8px 0}.cal-nav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.cal-nav p{margin:0;font-size:18px;font-weight:700;text-transform:capitalize}.icona{width:48px;height:48px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--ink);font:inherit;font-size:22px;cursor:pointer}.icona:disabled{color:#C5D0DA;cursor:not-allowed}.dow,.griglia{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px}.dow{margin-bottom:2px}.dow span{text-align:center;font-size:12px;font-weight:700;color:var(--muted);min-height:24px}.giorno{min-height:44px;width:100%;border:0;border-radius:10px;background:transparent;color:#8A97A6;font:inherit;font-weight:700;padding:4px 0;cursor:pointer}.giorno.aperto{background:var(--soft);color:var(--ink)}.giorno.aperto::after{content:"";width:4px;height:4px;border-radius:50%;background:currentColor;display:block;margin:2px auto 0}.giorno[aria-pressed="true"]{background:var(--pri);color:#fff}.giorno:disabled{cursor:not-allowed;opacity:.45}.vuoto{min-height:44px}.orari-giorno{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;margin-top:8px}.ora{min-height:48px;border:1px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);font:inherit;font-weight:700;cursor:pointer}.ora[aria-pressed="true"]{background:var(--pri);color:#fff;border-color:var(--pri)}label{display:block;font-weight:700;font-size:14px;margin:12px 0 4px}input[type="text"],input[type="tel"],input[type="email"]{width:100%;min-height:48px;border:1px solid var(--line);border-radius:10px;padding:0 12px;font:inherit;font-size:16px;color:var(--ink);background:#fff}.consenso{display:flex;align-items:flex-start;gap:8px;font-weight:400;margin-top:12px}.consenso input{width:20px;height:20px;margin-top:2px;flex:none}.invia{min-height:48px;width:100%;margin-top:16px;border:0;border-radius:12px;background:var(--pri);color:#fff;font:inherit;font-weight:700;cursor:pointer}@media (hover:hover){.scelta:hover:not([aria-pressed="true"]),.ora:hover:not([aria-pressed="true"]),.giorno.aperto:hover:not([aria-pressed="true"]){background:#d5e7f2}.invia:hover:not(:disabled),.icona:hover:not(:disabled){background:#24384F;color:#fff;border-color:#24384F}}.invia:disabled{background:#C5D0DA;color:#5C6B7C;cursor:not-allowed}.errore{color:var(--bad);font-size:14px;margin:4px 0 0}.non-valido input,.non-valido .consenso{outline:2px solid var(--bad);outline-offset:2px;border-radius:10px}.somma{background:#FDECEC;border-radius:12px;padding:12px;margin:0 0 12px}.somma a{color:var(--bad)}.ok{color:var(--ok);font-weight:700}.esca{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid var(--link);outline-offset:2px}button,a.invia{transition:background-color 150ms ease,color 150ms ease,border-color 150ms ease}@media (min-width:900px){header,footer,main{max-width:960px;padding-left:20px;padding-right:20px}main{grid-template-columns:minmax(280px,340px) minmax(0,1fr);align-items:start}.scheda-salone{position:sticky;top:16px}.scheda{padding:20px}}.nota{color:var(--muted);font-size:14px;font-weight:400;margin:12px 0 0}.aiuto{color:var(--muted);font-size:14px;font-weight:400;margin:0}.foto-riga{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.foto-anteprima{position:relative;width:88px;height:88px}.foto-anteprima img{width:88px;height:88px;object-fit:cover;border-radius:12px;border:1px solid var(--line);background:var(--soft)}.foto-togli{position:absolute;top:-8px;right:-8px;width:44px;height:44px;padding:0;display:grid;place-items:center;border:0;border-radius:50%;background:var(--pri);color:#fff;cursor:pointer;box-shadow:0 1px 2px rgba(44,69,96,.25)}.scegli-foto{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:8px;padding:0 16px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer}.file-nascosto{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media (prefers-reduced-motion:reduce){*,*::before,*::after{transition:none !important;scroll-behavior:auto !important}}`
