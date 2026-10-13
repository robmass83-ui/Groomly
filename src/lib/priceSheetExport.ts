import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

export function sheetFileName(nome: string, format: 'A4' | 'A3', tipo: 'pdf' | 'jpeg', page?: number): string {
  const stem = `Listino_${nome.replace(/\s+/g, '_')}_${format}`
  const withPage = page != null ? `${stem}_p${page}` : stem
  return `${withPage}.${tipo === 'pdf' ? 'pdf' : 'jpg'}`
}

function jpegBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const bytes = Uint8Array.from(atob(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl), (char) => char.charCodeAt(0))
  return new Blob([bytes], { type: 'image/jpeg' })
}

function pdfBlob(raw: Blob): Blob {
  return raw.type === 'application/pdf' ? raw : new Blob([raw], { type: 'application/pdf' })
}

export async function buildSheetFile(input: {
  title: string
  nome: string
  format: 'A4' | 'A3'
  tipoFile: 'pdf' | 'jpeg'
  pages: string[]
}): Promise<{ blob: Blob; name: string; mime: string }[]> {
  const { nome, format, tipoFile, pages } = input
  if (tipoFile === 'jpeg') {
    const numbered = pages.length > 1
    return pages.map((page, index) => ({
      blob: jpegBlob(page),
      name: sheetFileName(nome, format, 'jpeg', numbered ? index + 1 : undefined),
      mime: 'image/jpeg',
    }))
  }
  const width = format === 'A4' ? 210 : 297
  const height = format === 'A4' ? 297 : 420
  const doc = new jsPDF({ unit: 'mm', format: format.toLowerCase(), compress: true })
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage()
    doc.addImage(page, 'JPEG', 0, 0, width, height)
  })
  doc.setProperties({ title: 'Listino ' + nome })
  return [{
    blob: pdfBlob(doc.output('blob')),
    name: sheetFileName(nome, format, 'pdf'),
    mime: 'application/pdf',
  }]
}

async function nextFrame(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export async function renderSheetJpegs(container: HTMLElement, format: 'A4' | 'A3'): Promise<string[]> {
  const ready = document.fonts?.ready
  if (ready) await ready
  const images = [...container.querySelectorAll('img')]
  await Promise.all(images.map(async (img) => {
    if (!img.getAttribute('src')) return
    if (typeof img.decode === 'function') await img.decode()
  }))
  await nextFrame()
  const target = format === 'A3' ? 3508 : 2480
  const pages: string[] = []
  for (const node of container.querySelectorAll<HTMLElement>('.fly')) {
    pages.push(await toJpeg(node, {
      quality: 0.92,
      backgroundColor: '#fff',
      pixelRatio: target / (node.offsetWidth || 1),
    }))
  }
  return pages
}
