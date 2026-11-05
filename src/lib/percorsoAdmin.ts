// Il vecchio «Utenti Groomly» usava `zona`; l'Admin Manager usa `tab`. Gli altri parametri restano.
const ZONE: Record<string, string> = { saloni: 'saloni', salone: 'saloni', note: 'suggerimenti', coda: 'suggerimenti' }

export const PERCORSO_ADMIN = '/admin'
export const PERCORSO_AVVISI_ADMIN = '/admin/avvisi'

export function percorsoAdminDaUtenti(search: string): string {
  const params = new URLSearchParams(search)
  const zona = params.get('zona')
  params.delete('zona')
  if (zona && ZONE[zona] && !params.has('tab')) params.set('tab', ZONE[zona])
  const query = params.toString()
  return query ? `${PERCORSO_ADMIN}?${query}` : PERCORSO_ADMIN
}
