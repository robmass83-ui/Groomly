export function htmlPaginaPubblica(input: {
  lang: 'it' | 'en' | 'es'
  nome: string
  indirizzo: string
  telefono: string
  prenotabile: boolean
  salonId: string
  vat?: string
}): string {
  const nome = esc(input.nome)
  const descrizione = esc(input.indirizzo || (input.lang === 'en' ? 'Book online' : input.lang === 'es' ? 'Reserva online' : 'Prenota online'))
  const profilo = JSON.stringify({
    lang: input.lang,
    nome: input.nome,
    indirizzo: input.indirizzo,
    telefono: input.telefono,
    prenotabile: input.prenotabile,
    salonId: input.salonId,
  }).replace(/</g, '\\u003c')
  return `<!DOCTYPE html><html lang="${input.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${nome}</title><meta property="og:title" content="${nome}"><meta property="og:description" content="${descrizione}"><style>${CSS}</style></head><body><main><article class="card"><h1>${nome}</h1><p class="muto">${esc(input.indirizzo)}</p></article></main><script type="application/json" id="profilo">${profilo}</script><script src="/s/pagina.js" defer></script></body></html>`
}

function esc(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char)
}

const CSS = `:root{--bg:#ECEFF4;--card:#FFFFFF;--pri:#3A5BA0;--on-pri:#FFFFFF;--pri-s:#E6ECF8;--pri-ink:#2C4785;--tx:#141B2B;--tx2:#525D71;--line:#E1E6EE;--sh-2:0 1px 2px rgba(22,34,64,.05),0 6px 16px -6px rgba(22,34,64,.12);--bad:#C0362C}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.45 system-ui,"Segoe UI",sans-serif}main{max-width:880px;margin:0 auto;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}h1{margin:0;font-size:22px;line-height:1.2}.card{background:var(--card);border-radius:12px;box-shadow:var(--sh-2);padding:16px}.muto{color:var(--tx2);font-size:14px}button,a.btn{min-height:44px;border-radius:10px;border:0;background:var(--pri);color:var(--on-pri);font:inherit;font-weight:700;padding:0 12px}button:focus-visible,a:focus-visible{outline:2px solid var(--pri);outline-offset:2px}.chip{display:inline-flex;align-items:center;min-height:44px;padding:4px 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--tx);font:inherit;font-size:13px}.chip[aria-pressed="true"]{background:var(--pri);color:var(--on-pri);border-color:var(--pri)}.passi{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.passi span{height:28px;display:inline-flex;align-items:center;padding:0 8px;border-radius:999px;background:var(--bg);color:var(--tx2);font-size:13px}.passi span.ora{background:var(--pri);color:var(--on-pri)}@media (min-width:900px){main{display:grid;grid-template-columns:minmax(280px,340px) 1fr;gap:16px;align-items:start}}@media (prefers-color-scheme:dark){:root{--bg:#0C111A;--card:#151C28;--pri:#8AA4E8;--on-pri:#FFFFFF;--pri-s:rgba(138,164,232,.15);--pri-ink:#B3C6F4;--tx:#E9EDF4;--tx2:#A6B0C2;--line:#242E3F;--bad:#F07A70}}`
