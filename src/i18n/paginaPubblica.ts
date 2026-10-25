import { linguaDelTelefono, linguaValida, type Lingua } from './lingua'

/** `?lang=` vince. Un valore sconosciuto ricade sulla lingua del browser e poi sull’inglese. */
export function linguaPagina(parametro: string | null | undefined, browser: string | null | undefined): Lingua {
  const chiesta = linguaValida(parametro)
  if (chiesta) return chiesta
  if (parametro && parametro.trim() !== '') return linguaDelTelefono(browser)
  return linguaDelTelefono(browser)
}
