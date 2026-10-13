import { seedPriceSheet } from '../data/seed/priceSheet'
import type { SettingsMain } from '../data/local/settings'
import type { PriceSheet } from '../types/priceSheet'
import { priceSheetSchema } from './schemas'

export { iconForName } from './priceSheetIcon'

export function getPriceSheet(settings: SettingsMain): PriceSheet {
  const parsed = priceSheetSchema.safeParse(settings.priceSheet)
  if (!parsed.success) return seedPriceSheet(settings.business)
  return parsed.data
}
