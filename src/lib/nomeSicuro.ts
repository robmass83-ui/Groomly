const VIETATI = /[<>:"/\\|?*\u0000-\u001F\u007F]/g
const RISERVATI = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i

export function nomeSicuro(testo: string): string {
  let value = testo.replaceAll('+', 'e').replace(VIETATI, '')
  value = value.replace(/\s+/g, ' ').trim().replace(/[ .]+$/g, '')
  if (value === '') value = 'senza-nome'
  if (RISERVATI.test(value)) value = `${value}_`
  if (value.length > 60) {
    value = value.slice(0, 60)
    const last = value.charCodeAt(value.length - 1)
    if (last >= 0xD800 && last <= 0xDBFF) value = value.slice(0, -1)
    value = value.replace(/[ .]+$/g, '')
    if (value === '') value = 'senza-nome'
  }
  return value
}
