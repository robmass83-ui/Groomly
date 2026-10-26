const ACTION_ORIGIN = 'https://groomlyapp.it/azione/'

/** Tiene solo mode, oobCode e la lingua: il link in email non passa da firebaseapp.com. */
export function buildActionLink(firebaseLink: string, lang: 'it' | 'en' | 'es' = 'it'): string {
  const source = new URL(firebaseLink)
  const mode = source.searchParams.get('mode')
  const oobCode = source.searchParams.get('oobCode')
  if (!mode || !oobCode) throw new Error('Link senza mode o oobCode')
  const action = new URL(ACTION_ORIGIN)
  action.searchParams.set('mode', mode)
  action.searchParams.set('oobCode', oobCode)
  action.searchParams.set('lang', lang)
  if (action.hostname !== 'groomlyapp.it') throw new Error('Host azione inatteso')
  return action.toString()
}
