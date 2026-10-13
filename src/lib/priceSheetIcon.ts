import type { PriceIconKey } from '../assets/icons/icons'

export function iconForName(nome: string): PriceIconKey {
  const n = nome.toLowerCase()
  if (n.includes('sistemaz')) return 'bagno_sistemazione'
  if (n.includes('bagno') && (n.includes('tosat') || n.includes('taglio'))) return 'bagno_taglio'
  if (n.includes('pelo corto')) return 'pelo_corto'
  if (n.includes('pelo lungo')) return 'pelo_lungo'
  if (n.includes('unghie')) return 'unghie'
  if (n.includes('orecch')) return 'orecchie'
  if (n.includes('occhi')) return 'occhi'
  if (n.includes('antiparass')) return 'antiparassitario'
  if (n.includes('dermat')) return 'dermatologico'
  if (n.includes('shampoo')) return 'shampoo'
  if (n.includes('nodi')) return 'nodi'
  if (n.includes('tosat') || n.includes('taglio')) return 'taglio'
  return 'bagno'
}
