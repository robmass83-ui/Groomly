import { frase } from '../i18n/frase'
const NAMES: Record<string, string> = {
  'laura.masala@tiscali.it': 'Laura',
  'masala.roberto@hotmail.it': 'Roberto',
  'robmass83@gmail.com': 'Roberto',
}

export function greetingName(email: string | null | undefined): string | null {
  if (!email) return null
  return NAMES[email.trim().toLowerCase()] ?? null
}

export function greetingText(email: string | null | undefined, firstName?: string | null): string {
  const own = firstName?.trim()
  if (own) return frase('salutoNome', { nome: own })
  const name = greetingName(email)
  return name ? frase('salutoNome', { nome: name }) : frase('salutoAnonimo')
}
