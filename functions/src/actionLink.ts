const ACTION_ORIGIN = 'https://groomlyapp.it/azione'

/** Tiene solo mode e oobCode: il link in email non passa da firebaseapp.com. */
export function buildActionLink(firebaseLink: string): string {
  const source = new URL(firebaseLink)
  const mode = source.searchParams.get('mode')
  const oobCode = source.searchParams.get('oobCode')
  if (!mode || !oobCode) throw new Error('Link senza mode o oobCode')
  const action = new URL(ACTION_ORIGIN)
  action.searchParams.set('mode', mode)
  action.searchParams.set('oobCode', oobCode)
  action.searchParams.set('lang', 'it')
  if (action.hostname !== 'groomlyapp.it') throw new Error('Host azione inatteso')
  return action.toString()
}
