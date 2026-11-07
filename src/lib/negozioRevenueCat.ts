import { Purchases, type PurchasesPackage, type SubscriptionOption } from '@revenuecat/purchases-capacitor'
import type { NegozioAbbonamenti } from './billing'

// Adattatore sopra @revenuecat/purchases-capacitor 14 (configure, logIn, getOfferings, purchasePackage,
// purchaseSubscriptionOption, restorePurchases). Si importa solo da billing.ts con import(), ad abbonamenti accesi.
export function negozioRevenueCat(): NegozioAbbonamenti {
  return {
    async configura(apiKey, appUserID) {
      await Purchases.configure({ apiKey, appUserID })
    },
    async collega(appUserID) {
      await Purchases.logIn({ appUserID })
    },
    async offering(id) {
      const offerings = await Purchases.getOfferings()
      return offerings.all[id] ?? null
    },
    async compra(scelta, prodottoAttuale) {
      // Chi passa da Plus a Salon sostituisce l'abbonamento: due abbonamenti insieme si pesterebbero i piedi.
      const vecchio = (prodottoAttuale ?? '').split(':')[0]
      const cambio = vecchio ? { googleProductChangeInfo: { oldProductIdentifier: vecchio } } : {}
      if (scelta.tipo === 'pacchetto') await Purchases.purchasePackage({ aPackage: scelta.pacchetto as PurchasesPackage, ...cambio })
      else await Purchases.purchaseSubscriptionOption({ subscriptionOption: scelta.opzione as SubscriptionOption, ...cambio })
      return 'ok'
    },
    async ripristina() {
      await Purchases.restorePurchases()
    },
  }
}
