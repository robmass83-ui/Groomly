import { describe, expect, it } from 'vitest'
import { appointmentMediaPatch, backupLastAtPatch, dogMediaPatch, settingsMediaPatch } from './uploadPatch'

function applyUploadPatch(current: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(patch)) {
    const dot = key.indexOf('.')
    if (dot === -1) {
      next[key] = value
      continue
    }
    const parent = key.slice(0, dot)
    const child = key.slice(dot + 1)
    const existing = next[parent]
    const base = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {}
    base[child] = value
    next[parent] = base
  }
  return next
}

describe('uploadPatch', () => {
  it('sul cane scrive solo gli URL e lascia il nome del documento corrente', () => {
    const current = {
      name: 'Luna',
      breed: 'Pastore',
      gallery: [
        { id: 'g1', photo: 'https://files.example/g1.jpg', takenAt: 1 },
        { id: 'g2', takenAt: 2, label: 'lato' },
      ],
    }
    const patch = dogMediaPatch(current, {
      photo: 'https://files.example/profile.jpg',
      gallery: [
        { id: 'g2', photo: 'https://files.example/g2.jpg', takenAt: 99 },
        { id: 'g3', photo: 'data:image/jpeg;base64,QQ==', takenAt: 3 },
      ],
    })
    expect(patch).toEqual({
      photo: 'https://files.example/profile.jpg',
      gallery: [
        { id: 'g1', photo: 'https://files.example/g1.jpg', takenAt: 1 },
        { id: 'g2', takenAt: 2, label: 'lato', photo: 'https://files.example/g2.jpg' },
      ],
    })
    expect(applyUploadPatch(current, patch).name).toBe('Luna')
    expect(JSON.stringify(patch)).not.toContain('data:')
    expect(JSON.stringify(patch)).not.toContain('snapshot')
  })

  it('aggiunge la foto di galleria mancante e ignora un data URL', () => {
    const current = { name: 'Luna', gallery: [{ id: 'g1', photo: 'data:image/jpeg;base64,QQ==', takenAt: 4 }] }
    const patch = dogMediaPatch(current, {
      photo: 'data:image/jpeg;base64,Qg==',
      gallery: [{ id: 'g1', photo: 'https://files.example/g1.jpg' }, { id: 'g9', photo: 'https://files.example/g9.jpg', takenAt: 5 }],
    })
    expect(patch).toEqual({
      gallery: [
        { id: 'g1', takenAt: 4, photo: 'https://files.example/g1.jpg' },
        { id: 'g9', photo: 'https://files.example/g9.jpg', takenAt: 5 },
      ],
    })
    expect(JSON.stringify(patch)).not.toContain('data:')
  })

  it('sull’appuntamento scrive solo le foto e lascia servizi e stile', () => {
    const current = {
      dogId: 'd1',
      services: [{ serviceId: 's1', name: 'Bagno' }],
      cutStyle: 'corto',
      photos: [{ id: 'p1', kind: 'dopo', note: 'lato' }],
    }
    const patch = appointmentMediaPatch(current, [
      { id: 'p1', photo: 'https://files.example/p1.jpg', kind: 'prima' },
      { id: 'p2', photo: 'data:image/jpeg;base64,QQ==', kind: 'altro' },
      { id: 'p3', photo: 'https://files.example/p3.jpg', kind: 'prima' },
    ])
    expect(patch).toEqual({
      photos: [
        { id: 'p1', kind: 'dopo', note: 'lato', photo: 'https://files.example/p1.jpg' },
        { id: 'p3', photo: 'https://files.example/p3.jpg', kind: 'prima' },
      ],
    })
    const next = applyUploadPatch(current, patch)
    expect(next.dogId).toBe('d1')
    expect(next.services).toEqual([{ serviceId: 's1', name: 'Bagno' }])
    expect(next.cutStyle).toBe('corto')
    expect(JSON.stringify(patch)).not.toContain('data:')
  })

  it('sul listino scrive solo il dataUrl dello stesso id e lascia tema, attività ed etichette', () => {
    const current = {
      theme: 'dark',
      business: { name: 'Salon nuovo' },
      fieldLabels: { breed: 'Razza' },
      updatedAt: '2026-10-09T18:00:00.000Z',
      priceList: { id: 'p2', fileName: 'nuovo.pdf' },
      priceListHistory: [
        { id: 'p1', fileName: 'listino.pdf', mime: 'application/pdf' },
        { id: 'p0', fileName: 'vecchio.pdf', dataUrl: 'https://files.example/old.pdf' },
      ],
      backup: { autoDaily: true, snapshot: { dogs: { a: 1 } } },
    }
    const patch = settingsMediaPatch(current, [
      { id: 'p1', dataUrl: 'https://files.example/listino.pdf' },
      { id: 'p9', dataUrl: 'data:application/pdf;base64,QQ==' },
    ])
    expect(patch).toEqual({
      priceListHistory: [
        { id: 'p1', fileName: 'listino.pdf', mime: 'application/pdf', dataUrl: 'https://files.example/listino.pdf' },
        { id: 'p0', fileName: 'vecchio.pdf', dataUrl: 'https://files.example/old.pdf' },
      ],
    })
    expect(patch).not.toHaveProperty('priceList.dataUrl')
    const next = applyUploadPatch(current, patch)
    expect(next.theme).toBe('dark')
    expect(next.business).toEqual({ name: 'Salon nuovo' })
    expect(next.fieldLabels).toEqual({ breed: 'Razza' })
    expect(next.updatedAt).toBe('2026-10-09T18:00:00.000Z')
    expect(JSON.stringify(patch)).not.toContain('data:')
    expect(JSON.stringify(patch)).not.toContain('snapshot')
  })

  it('attacca il dataUrl del listino corrente senza sostituire il file', () => {
    const current = {
      theme: 'light',
      business: { name: 'Salon' },
      fieldLabels: { breed: 'Razza' },
      priceList: { id: 'p1', fileName: 'listino.pdf', byteSize: 2 },
      priceListHistory: [{ id: 'p1', fileName: 'listino.pdf', dataUrl: 'data:application/pdf;base64,QQ==' }],
    }
    const patch = settingsMediaPatch(current, [{ id: 'p1', dataUrl: 'https://files.example/listino.pdf' }])
    expect(patch['priceList.dataUrl']).toBe('https://files.example/listino.pdf')
    expect(patch.priceListHistory).toEqual([
      { id: 'p1', fileName: 'listino.pdf', dataUrl: 'https://files.example/listino.pdf' },
    ])
    const next = applyUploadPatch(current, patch)
    expect(next.priceList).toEqual({ id: 'p1', fileName: 'listino.pdf', byteSize: 2, dataUrl: 'https://files.example/listino.pdf' })
    expect(next.theme).toBe('light')
    expect(next.business).toEqual({ name: 'Salon' })
    expect(next.fieldLabels).toEqual({ breed: 'Razza' })
    expect(JSON.stringify(patch)).not.toContain('data:')
  })

  it('il backup giornaliero scrive solo lastAt', () => {
    const current = {
      theme: 'dark',
      business: { name: 'Salon nuovo' },
      fieldLabels: { breed: 'Razza' },
      updatedAt: '2026-10-09T18:00:00.000Z',
      backup: { autoDaily: false, lastAt: '2026-10-01T00:00:00.000Z' },
    }
    const patch = backupLastAtPatch('2026-10-09T12:00:00.000Z')
    expect(patch).toEqual({ 'backup.lastAt': '2026-10-09T12:00:00.000Z' })
    const next = applyUploadPatch(current, patch)
    expect(next.theme).toBe('dark')
    expect(next.business).toEqual({ name: 'Salon nuovo' })
    expect(next.fieldLabels).toEqual({ breed: 'Razza' })
    expect(next.updatedAt).toBe('2026-10-09T18:00:00.000Z')
    expect(next.backup).toEqual({ autoDaily: false, lastAt: '2026-10-09T12:00:00.000Z' })
    expect(JSON.stringify(patch)).not.toContain('snapshot')
    expect(JSON.stringify(patch)).not.toContain('autoDaily')
    expect(JSON.stringify(patch)).not.toContain('data:')
  })
})
