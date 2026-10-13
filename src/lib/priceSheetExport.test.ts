import { beforeEach, describe, expect, it, vi } from 'vitest'

const { addImage, setProperties, addPage, output, jsPDF, toJpeg } = vi.hoisted(() => ({
  addImage: vi.fn(),
  setProperties: vi.fn(),
  addPage: vi.fn(),
  output: vi.fn(() => new Blob(['%PDF'])),
  jsPDF: vi.fn(),
  toJpeg: vi.fn(async () => 'data:image/jpeg;base64,QQ=='),
}))

jsPDF.mockImplementation(function JsPdfMock() {
  return { addImage, setProperties, addPage, output }
})

vi.mock('jspdf', () => ({ jsPDF }))
vi.mock('html-to-image', () => ({ toJpeg }))

import { buildSheetFile, renderSheetJpegs, sheetFileName } from './priceSheetExport'

const PAGE = 'data:image/jpeg;base64,QQ=='

describe('sheetFileName', () => {
  it('compone Listino_nome_formato e il suffisso pagina jpeg', () => {
    expect(sheetFileName('I Pelosetti', 'A4', 'pdf')).toBe('Listino_I_Pelosetti_A4.pdf')
    expect(sheetFileName('I Pelosetti', 'A3', 'jpeg', 1)).toBe('Listino_I_Pelosetti_A3_p1.jpg')
    expect(sheetFileName('I Pelosetti', 'A3', 'jpeg', 2)).toBe('Listino_I_Pelosetti_A3_p2.jpg')
    expect(sheetFileName('I Pelosetti', 'A4', 'jpeg')).toBe('Listino_I_Pelosetti_A4.jpg')
  })
})

describe('buildSheetFile', () => {
  beforeEach(() => {
    addImage.mockClear()
    setProperties.mockClear()
    addPage.mockClear()
    output.mockClear()
    jsPDF.mockClear()
  })

  it('un pdf A4 è un solo blob e addImage usa 210×297', async () => {
    const files = await buildSheetFile({
      title: 'Listino I Pelosetti',
      nome: 'I Pelosetti',
      format: 'A4',
      tipoFile: 'pdf',
      pages: [PAGE],
    })
    expect(files).toHaveLength(1)
    expect(files[0]?.mime).toBe('application/pdf')
    expect(files[0]?.name).toBe('Listino_I_Pelosetti_A4.pdf')
    expect(files[0]?.blob.type).toBe('application/pdf')
    expect(jsPDF).toHaveBeenCalledWith({ unit: 'mm', format: 'a4', compress: true })
    expect(addImage).toHaveBeenCalledWith(PAGE, 'JPEG', 0, 0, 210, 297)
    expect(setProperties).toHaveBeenCalledWith({ title: 'Listino I Pelosetti' })
    expect(addPage).not.toHaveBeenCalled()
  })

  it('due jpeg sono _p1.jpg e _p2.jpg', async () => {
    const files = await buildSheetFile({
      title: 'Listino I Pelosetti',
      nome: 'I Pelosetti',
      format: 'A4',
      tipoFile: 'jpeg',
      pages: [PAGE, PAGE],
    })
    expect(files.map((file) => file.name)).toEqual([
      'Listino_I_Pelosetti_A4_p1.jpg',
      'Listino_I_Pelosetti_A4_p2.jpg',
    ])
    expect(files.every((file) => file.mime === 'image/jpeg')).toBe(true)
    expect(jsPDF).not.toHaveBeenCalled()
  })

  it('un pdf A3 chiama addImage con 297×420', async () => {
    await buildSheetFile({
      title: 'Listino I Pelosetti',
      nome: 'I Pelosetti',
      format: 'A3',
      tipoFile: 'pdf',
      pages: [PAGE],
    })
    expect(jsPDF).toHaveBeenCalledWith({ unit: 'mm', format: 'a3', compress: true })
    expect(addImage).toHaveBeenCalledWith(PAGE, 'JPEG', 0, 0, 297, 420)
  })
})

describe('renderSheetJpegs', () => {
  beforeEach(() => {
    toJpeg.mockClear()
  })

  it('fotografa ogni .fly con pixelRatio 2480/offsetWidth su A4', async () => {
    const node = document.createElement('div')
    node.className = 'fly'
    Object.defineProperty(node, 'offsetWidth', { value: 794 })
    const container = document.createElement('div')
    container.appendChild(node)
    const pages = await renderSheetJpegs(container, 'A4')
    expect(pages).toEqual(['data:image/jpeg;base64,QQ=='])
    expect(toJpeg).toHaveBeenCalledWith(node, expect.objectContaining({
      quality: 0.92,
      backgroundColor: '#fff',
    }))
    const options = toJpeg.mock.calls[0]?.[1] as { pixelRatio: number }
    expect(options.pixelRatio).toBeCloseTo(2480 / 794)
  })
})
