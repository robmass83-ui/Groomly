export function confermaEliminaValida(scritto: string, nomeSalone: string): boolean {
  const testo = scritto.trim()
  if (testo === 'ELIMINA') return true
  const nome = nomeSalone.trim()
  return nome.length > 0 && testo === nome
}
