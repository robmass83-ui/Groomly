import { frase } from '../i18n/frase'

/** Il saluto usa il nome del profilo: nel codice, che è pubblico, non stanno email di persone vere. */
export function greetingText(firstName?: string | null): string {
  const own = firstName?.trim()
  return own ? frase('salutoNome', { nome: own }) : frase('salutoAnonimo')
}
