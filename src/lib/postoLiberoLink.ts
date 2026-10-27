const GIORNO = /^\d{4}-\d{2}-\d{2}$/
const ORA = /^([01]\d|2[0-3]):[0-5]\d$/

export function parametriPosto(giorno: string, ora: string): { giorno: string; ora: string } | null {
  if (!GIORNO.test(giorno) || !ORA.test(ora)) return null
  return { giorno, ora }
}
