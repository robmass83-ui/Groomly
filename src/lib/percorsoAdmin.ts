// I link vecchi: «Utenti Groomly» usava `zona`, l'Admin Manager `tab`. Portano alle rotte della Console.
const ZONE: Record<string, string> = { saloni: 'saloni', salone: 'saloni', note: 'suggerimenti', coda: 'suggerimenti' }

export const PERCORSO_ADMIN = '/admin'
export const PERCORSO_SALONI = '/admin/saloni'
export const PERCORSO_BETA = '/admin/beta'
export const PERCORSO_ASSISTENZA = '/admin/assistenza'
export const PERCORSO_COMUNICAZIONI = '/admin/comunicazioni'
export const PERCORSO_PIANI = '/admin/piani'
export const PERCORSO_METRICHE = '/admin/metriche'
export const PERCORSO_REGISTRO = '/admin/registro'
export const PERCORSO_SISTEMA = '/admin/sistema'
export const PERCORSO_ALTRO = '/admin/altro'

function conQuery(percorso: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `${percorso}?${query}` : percorso
}

export function percorsoSalone(salonId: string): string {
  return `${PERCORSO_SALONI}/${encodeURIComponent(salonId)}`
}

export function haParametriVecchi(search: string): boolean {
  const params = new URLSearchParams(search)
  return params.has('tab') || params.has('zona')
}

export function percorsoAdminDaVecchio(search: string): string {
  const params = new URLSearchParams(search)
  const zona = params.get('zona') ?? ''
  const tab = params.get('tab') ?? ZONE[zona] ?? ''
  const id = params.get('id')
  params.delete('zona')
  params.delete('tab')
  if (tab === 'saloni' || tab === 'beta') {
    params.delete('id')
    if (id) return conQuery(percorsoSalone(id), params)
    return conQuery(tab === 'beta' ? PERCORSO_BETA : PERCORSO_SALONI, params)
  }
  if (tab === 'feedback' || tab === 'suggerimenti') {
    params.set('fonte', tab)
    return conQuery(PERCORSO_ASSISTENZA, params)
  }
  if (tab === 'piani') return conQuery(PERCORSO_PIANI, params)
  return conQuery(PERCORSO_ADMIN, params)
}
