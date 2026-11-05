import { useFrasi } from '../../i18n/LinguaContext'

export function useEtichettaCategoria(): (id: string) => string {
  const frasi = useFrasi()
  return (id) => {
    const mappa: Record<string, string> = {
      bug: frasi.sugCatBug,
      critica: frasi.sugCatCritica,
      miglioramento: frasi.sugCatMigliora,
      manca: frasi.sugCatManca,
      agenda: frasi.sugCatAgenda,
      animali: frasi.sugCatAnimali,
      listino: frasi.sugCatListino,
      incassi: frasi.sugCatIncassi,
      account: frasi.sugCatAccount,
      lingua: frasi.sugCatLingua,
      altro: frasi.sugCatAltro,
    }
    return mappa[id] ?? id
  }
}
