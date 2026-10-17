import { beforeEach, describe, expect, it, vi } from 'vitest'
import { addPriceFile, DEFAULT_EXPORT, dropOldestPrice, getSettings, pdfPageCount, priceFileMeta, rememberDog, removePriceFile, renamePriceFile, setTheme, type PriceFile } from './settings'
import { readJson, storageKeys } from './storage'

function priceFile(id: string, extra: Partial<PriceFile> = {}): PriceFile {
  return {
    id,
    fileName: `${id}.pdf`,
    mime: 'application/pdf',
    byteSize: 2048,
    uploadedAt: '2026-10-01T00:00:00.000Z',
    dataUrl: 'data:application/pdf;base64,QQ==',
    ...extra,
  }
}

describe('settings', () => {
  beforeEach(() => localStorage.clear())

  it('crea il tema auto se il documento manca', () => {
    const settings = getSettings('uid-1')
    expect(settings.theme).toBe('auto')
    expect(readJson(storageKeys.settings('uid-1'))).toMatchObject({ theme: 'auto' })
  })

  it('salva il tema scelto', () => {
    setTheme('uid-1', 'dark')
    expect(getSettings('uid-1').theme).toBe('dark')
  })

  it('se la scrittura fallisce non cambia il tema già letto', () => {
    setTheme('uid-1', 'light')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => setTheme('uid-1', 'dark')).toThrow()
    vi.restoreAllMocks()
    expect(getSettings('uid-1').theme).toBe('light')
  })

  it('legge un json vecchio con i default e non lo riscrive', () => {
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'dark', updatedAt: '2026-10-01T00:00:00.000Z' }))
    const before = localStorage.getItem(storageKeys.settings('uid-1'))
    const settings = getSettings('uid-1')
    expect(settings.theme).toBe('dark')
    expect(settings.monthlyReminder).toEqual({ enabled: true, time: '18:30', daysBefore: 7 })
    expect(settings.backup).toEqual({ autoDaily: false })
    expect(settings.ageThresholds).toEqual({ giovaneFrom: 1, adultoFrom: 3, anzianoFrom: 8 })
    expect(settings.recentDogIds).toEqual([])
    expect(settings.ui).toEqual({ hideAmounts: false })
    expect(localStorage.getItem(storageKeys.settings('uid-1'))).toBe(before)
  })

  it('rememberDog mette in cima e tiene otto id', () => {
    const settings = getSettings('uid-1')
    const first = rememberDog(settings, 'a')
    const second = rememberDog({ ...first, recentDogIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }, 'a')
    expect(second.recentDogIds[0]).toBe('a')
    expect(second.recentDogIds).toHaveLength(8)
    expect(second.recentDogIds.filter((id) => id === 'a')).toHaveLength(1)
  })

  it('addPriceFile accoda il file senza spostare quello già presente e non scrive', () => {
    const settings = getSettings('uid-1')
    const history = [priceFile('older')]
    const current = { ...settings, priceList: priceFile('old'), priceListHistory: history }
    const next = addPriceFile(current, priceFile('new'))
    expect(next.priceList?.id).toBe('old')
    expect(next.priceListHistory.map((item) => item.id)).toEqual(['older', 'new'])
    expect(history.map((item) => item.id)).toEqual(['older'])
    expect(getSettings('uid-1').priceList).toBeUndefined()
  })

  it('addPriceFile senza file attuale lo mette come primo', () => {
    const next = addPriceFile(getSettings('uid-1'), priceFile('new'))
    expect(next.priceList?.id).toBe('new')
    expect(next.priceListHistory).toEqual([])
  })

  it('renamePriceFile cambia solo il nome indicato e ignora un nome vuoto', () => {
    const settings = {
      ...getSettings('uid-1'),
      priceList: priceFile('current', { fileName: 'a.pdf' }),
      priceListHistory: [priceFile('old', { fileName: 'b.pdf' })],
    }
    const renamed = renamePriceFile(settings, 'old', '  estate.pdf  ')
    expect(renamed.priceList?.fileName).toBe('a.pdf')
    expect(renamed.priceListHistory[0]?.fileName).toBe('estate.pdf')
    expect(renamePriceFile(settings, 'current', '   ').priceList?.fileName).toBe('a.pdf')
    expect(getSettings('uid-1').priceList).toBeUndefined()
  })

  it('removePriceFile toglie un file e, se manca il primo, promuove il successivo', () => {
    const settings = {
      ...getSettings('uid-1'),
      priceList: priceFile('current'),
      priceListHistory: [priceFile('mid'), priceFile('old')],
    }
    const withoutCurrent = removePriceFile(settings, 'current')
    expect(withoutCurrent.priceList?.id).toBe('mid')
    expect(withoutCurrent.priceListHistory.map((item) => item.id)).toEqual(['old'])
    const withoutOld = removePriceFile(settings, 'old')
    expect(withoutOld.priceList?.id).toBe('current')
    expect(withoutOld.priceListHistory.map((item) => item.id)).toEqual(['mid'])
  })

  it('priceFileMeta di un jpeg da 340000 byte contiene Immagine e KB', () => {
    const meta = priceFileMeta(priceFile('foto', { mime: 'image/jpeg', byteSize: 340000, fileName: 'foto.jpg' }))
    expect(meta).toContain('Immagine')
    expect(meta).toContain('KB')
    expect(meta).toBe('Immagine · 332 KB')
  })

  it('priceFileMeta descrive un pdf senza pagine e le pagine lette', () => {
    expect(priceFileMeta(priceFile('a'))).toBe('PDF · 2 KB')
    expect(priceFileMeta(priceFile('a', { pageCount: 1 }))).toBe('1 pagina · 2 KB')
    expect(priceFileMeta(priceFile('a', { pageCount: 2 }))).toBe('2 pagine · 2 KB')
    expect(priceFileMeta(priceFile('a', { byteSize: Math.round(1.5 * 1024 * 1024) }))).toBe('PDF · 1,5 MB')
  })

  it('dropOldestPrice toglie l’ultimo elemento dello storico', () => {
    const settings = { ...getSettings('uid-1'), priceListHistory: [priceFile('recent'), priceFile('oldest')] }
    expect(dropOldestPrice(settings).priceListHistory.map((item) => item.id)).toEqual(['recent'])
    expect(dropOldestPrice({ ...settings, priceListHistory: [] }).priceListHistory).toEqual([])
  })

  it('dropOldestPrice tiene i file appena aggiunti e toglie il più vecchio', () => {
    const settings = {
      ...getSettings('uid-1'),
      priceList: priceFile('current'),
      priceListHistory: [
        priceFile('mid', { uploadedAt: '2026-01-01T00:00:00.000Z' }),
        priceFile('oldest', { uploadedAt: '2025-01-01T00:00:00.000Z' }),
        priceFile('new', { uploadedAt: '2026-10-01T00:00:00.000Z' }),
      ],
    }
    expect(dropOldestPrice(settings, ['new']).priceList?.id).toBe('current')
    expect(dropOldestPrice(settings, ['new']).priceListHistory.map((item) => item.id)).toEqual(['mid', 'new'])
    const onlyNew = { ...settings, priceListHistory: [priceFile('new')] }
    expect(dropOldestPrice(onlyNew, 'new').priceListHistory.map((item) => item.id)).toEqual(['new'])
  })

  it('pdfPageCount conta /Type /Page solo se il numero è maggiore di zero', () => {
    expect(pdfPageCount('/Type /Pages /Type /Page /Type /Page')).toBe(2)
    expect(pdfPageCount('/Type /Pages')).toBeUndefined()
    expect(pdfPageCount('senza pagine')).toBeUndefined()
  })

  it('ui.hideAmounts si legge solo se è true', () => {
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'auto', updatedAt: '2026-10-01T00:00:00.000Z', ui: { hideAmounts: true } }))
    expect(getSettings('uid-1').ui.hideAmounts).toBe(true)
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({ theme: 'auto', updatedAt: '2026-10-01T00:00:00.000Z', ui: { hideAmounts: 'sì' } }))
    expect(getSettings('uid-1').ui.hideAmounts).toBe(false)
  })

  it('reportBadgeSince si tiene solo se è un giorno, exportPrefs rotto torna ai default', () => {
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({
      theme: 'auto',
      updatedAt: '2026-10-01T00:00:00.000Z',
      ui: { hideAmounts: true, reportBadgeSince: '2026-10-17' },
      exportPrefs: { formato: 'csv', periodo: 'anno', include: { riepilogo: false, dettaglio: false, attivita: false, mancati: true } },
    }))
    const saved = getSettings('uid-1')
    expect(saved.ui).toEqual({ hideAmounts: true, reportBadgeSince: '2026-10-17' })
    expect(saved.exportPrefs).toEqual({
      formato: 'csv',
      periodo: 'anno',
      include: { riepilogo: true, dettaglio: false, attivita: false, mancati: true },
    })
    localStorage.setItem(storageKeys.settings('uid-1'), JSON.stringify({
      theme: 'auto',
      updatedAt: '2026-10-01T00:00:00.000Z',
      ui: { hideAmounts: false, reportBadgeSince: 'ieri' },
      exportPrefs: { formato: 'bonifico' },
    }))
    const broken = getSettings('uid-1')
    expect(broken.ui).toEqual({ hideAmounts: false })
    expect(broken.exportPrefs).toEqual(DEFAULT_EXPORT)
  })
})
