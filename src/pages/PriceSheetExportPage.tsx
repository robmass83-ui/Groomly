import { Capacitor } from '@capacitor/core'
import { Check, Download, Maximize2, Printer, Share2, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type TouchEvent } from 'react'
import { Dialog } from '../components/layout/Dialog'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { PriceSheetPaper } from '../components/priceSheet/PriceSheetPaper'
import { Button } from '../components/ui/Button'
import { Card, Row } from '../components/ui/Card'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { useFileSrc } from '../hooks/useFileSrc'
import { etichetteListino } from '../i18n/listino'
import { useFrasi, useLingua } from '../i18n/LinguaContext'
import { t } from '../i18n/t'
import { linguaValida, type Lingua } from '../i18n/lingua'
import { useSettings } from '../hooks/useSettings'
import { openPdfBlob } from '../lib/openDocument'
import { clampPan, pinchScale } from '../lib/pinchScale'
import { getPriceSheet, PRICE_SHEET_UNREADABLE, savePriceSheet } from '../lib/priceSheet'
import { downloadAnchor, isShareCancel, shareFiles, writeDocuments } from '../lib/shareFile'
import { buildSheetFile, renderSheetJpegs } from '../lib/priceSheetExport'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { PriceSheet } from '../types/priceSheet'

const PREVIEW_W = 236
const NOMI_LINGUA: Record<Lingua, string> = { it: 'Italiano', en: 'English', es: 'Español' }

type Action = 'share' | 'download' | 'print'

function paperSize(format: 'A4' | 'A3') {
  return format === 'A3' ? { w: 1123, h: 1587 } : { w: 794, h: 1123 }
}

function fingerDistance(touches: ArrayLike<{ clientX: number; clientY: number }>): number {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

function preparingToast(format: 'A4' | 'A3', tipoFile: 'pdf' | 'jpeg', lingua: Lingua) {
  return tipoFile === 'pdf' ? t(lingua, 'lisPreparoPdf', { formato: format }) : t(lingua, 'lisPreparoImg', { formato: format })
}

export function fullscreenFit(frameW: number, frameH: number, paperW: number, contentH: number): number {
  if (frameW <= 0 || frameH <= 0 || paperW <= 0 || contentH <= 0) return 1
  return Math.min(frameW / paperW, frameH / contentH)
}

export function fitCaption(
  paper: { pages: string | null; fitOk: string | null } | null,
  format: 'A4' | 'A3',
  k: number,
  lingua: Lingua = 'it',
): string | null {
  if (!paper) return null
  if (paper.pages === '2' || paper.fitOk !== 'true') {
    return t(lingua, 'lisDuePagine')
  }
  return t(lingua, 'lisTuttoPagina', { formato: format, k: Math.round(k * 100) })
}

function useFitStatus(host: HTMLElement | null, format: 'A4' | 'A3', lingua: Lingua) {
  const [fit, setFit] = useState<{ paper: { pages: string | null; fitOk: string | null } | null; k: number }>({
    paper: null,
    k: 1,
  })
  useEffect(() => {
    if (!host) return
    const read = () => {
      const paper = host.querySelector('[data-pages], [data-fit-ok]')
      const fly = host.querySelector<HTMLElement>('.fly')
      if (!paper) return
      const pages = paper.getAttribute('data-pages')
      const fitOk = paper.getAttribute('data-fit-ok')
      const parsed = fly ? Number.parseFloat(getComputedStyle(fly).getPropertyValue('--k')) : 1
      const k = Number.isFinite(parsed) ? parsed : 1
      setFit((current) => {
        if (current.paper?.pages === pages && current.paper.fitOk === fitOk && current.k === k) return current
        return { paper: { pages, fitOk }, k }
      })
    }
    const observer = new MutationObserver(read)
    observer.observe(host, { attributes: true, subtree: true, attributeFilter: ['data-fit-ok', 'data-pages'] })
    const frame = requestAnimationFrame(read)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [host, format])
  return fitCaption(fit.paper, format, fit.k, lingua)
}

export function PriceSheetExportPage() {
  const frasi = useFrasi()
  const { lingua } = useLingua()
  const toast = useToast()
  const { settings, save } = useSettings()
  const sheet = getPriceSheet(settings)
  const linguaFoglio = sheet.opzioni.lingua ?? linguaValida(settings.linguaClienti) ?? lingua
  const etichette = etichetteListino(linguaFoglio)
  const logoSrc = useFileSrc(sheet.intestazione.logo, 'full')
  const format = sheet.opzioni.formato
  const tipoFile = sheet.opzioni.tipoFile
  const { w: paperW, h: paperH } = paperSize(format)
  const previewScale = PREVIEW_W / paperW
  const [busy, setBusy] = useState(false)
  const [linguaAperta, setLinguaAperta] = useState(false)
  const [full, setFull] = useState(false)
  const [exportHost, setExportHost] = useState<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [frameBox, setFrameBox] = useState({ w: 0, h: 0 })
  const [contentH, setContentH] = useState(paperH)
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })
  const frameRef = useRef<HTMLButtonElement>(null)
  const fullPaperRef = useRef<HTMLDivElement>(null)
  const gesture = useRef({ distance: 0, scale: 1 })
  const drag = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const fit = useFitStatus(exportHost, format, lingua)
  const fitScale = fullscreenFit(frameBox.w, frameBox.h, paperW, contentH)
  const shownW = paperW * fitScale
  const shownH = contentH * fitScale

  useLayoutEffect(() => {
    if (!full) return
    const host = fullPaperRef.current
    const frame = frameRef.current
    const measure = () => {
      const box = frame?.getBoundingClientRect()
      const nextBox = { w: box?.width ?? 0, h: box?.height ?? 0 }
      setFrameBox((current) => (current.w === nextBox.w && current.h === nextBox.h ? current : nextBox))
      const flies = [...(host?.querySelectorAll<HTMLElement>('.fly') ?? [])]
      const flyH = flies.reduce((sum, node) => sum + node.offsetHeight, 0)
      const pages = Number(host?.querySelector('[data-pages]')?.getAttribute('data-pages')) || flies.length || 1
      const nextH = flyH > 0 ? flyH : paperH * pages
      setContentH((current) => (current === nextH ? current : nextH))
    }
    measure()
    if (!host) return
    const observer = new MutationObserver(measure)
    observer.observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pages'] })
    return () => observer.disconnect()
  }, [full, format, paperH])

  function persistOpzioni(patch: Partial<PriceSheet['opzioni']>) {
    const message = savePriceSheet(settings, { ...sheet, opzioni: { ...sheet.opzioni, ...patch } }, save)
    if (message) toast.show(message === PRICE_SHEET_UNREADABLE ? frasi.lisIlleggibile : message, 'plain')
  }

  function rememberScale(next: number) {
    scaleRef.current = next
    setScale(next)
    if (next <= 1) rememberPan({ x: 0, y: 0 })
  }

  function rememberPan(next: { x: number; y: number }) {
    panRef.current = next
    setPan(next)
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length >= 2) {
      const distance = fingerDistance(event.touches)
      gesture.current = { distance, scale: scaleRef.current }
      rememberScale(pinchScale(distance, distance, scaleRef.current))
      return
    }
    const touch = event.touches[0]
    if (!touch || scaleRef.current <= 1) return
    drag.current = { x: touch.clientX, y: touch.clientY, panX: panRef.current.x, panY: panRef.current.y }
  }

  function onTouchMove(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length >= 2) {
      if (gesture.current.distance <= 0) {
        gesture.current = { distance: fingerDistance(event.touches), scale: scaleRef.current }
      }
      const next = pinchScale(gesture.current.distance, fingerDistance(event.touches), gesture.current.scale)
      rememberScale(next)
      rememberPan(clampPan(panRef.current.x, panRef.current.y, next, shownW, shownH))
      return
    }
    const touch = event.touches[0]
    if (!touch || scaleRef.current <= 1) return
    rememberPan(clampPan(
      drag.current.panX + (touch.clientX - drag.current.x),
      drag.current.panY + (touch.clientY - drag.current.y),
      scaleRef.current,
      shownW,
      shownH,
    ))
  }

  async function run(kind: Action) {
    if (busy) return
    setBusy(true)
    const tipo = kind === 'print' ? 'pdf' : tipoFile
    toast.show(preparingToast(format, tipo, lingua), 'plain')
    try {
      const host = exportHost
      if (!host) throw new Error('foglio assente')
      const pages = await renderSheetJpegs(host, format)
      const files = await buildSheetFile({
        title: `${etichette.titolo} ${sheet.intestazione.nome}`,
        nome: sheet.intestazione.nome,
        format,
        tipoFile: tipo,
        pages,
      })
      if (kind === 'print') {
        const pdf = files[0]
        if (pdf) await openPdfBlob(pdf.blob, pdf.name)
        return
      }
      if (kind === 'download' && !Capacitor.isNativePlatform()) {
        for (const file of files) downloadAnchor(file.blob, file.name)
        return
      }
      if (kind === 'download') {
        try {
          await writeDocuments(files)
          toast.show(frasi.lisSalvatoDoc, 'ok')
        } catch {
          await shareFiles(files, etichette.prezzi)
          toast.show(frasi.lisScegliDove, 'plain')
        }
        return
      }
      await shareFiles(files, etichette.prezzi)
    } catch (error) {
      if (!isShareCancel(error)) toast.show(frasi.lisExportKo, 'plain')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PhoneShell>
      <Header title={frasi.lisStampa} subtitle={frasi.lisStampaSottotitolo} backTo="/listino" />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '6px 12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          ref={setExportHost}
          aria-hidden
          style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none' }}
        >
          <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} lingua={linguaFoglio} />
        </div>
        <div style={{ background: 'var(--surf)', borderRadius: 12, padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{ width: PREVIEW_W, height: paperH * previewScale, overflow: 'hidden', boxShadow: '0 8px 20px -8px rgba(0,0,0,.4)', background: '#fff' }}>
            <div style={{ width: paperW, transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
              <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} lingua={linguaFoglio} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              rememberScale(1)
              rememberPan({ x: 0, y: 0 })
              setFull(true)
            }}
            style={{ border: 0, background: 'transparent', color: 'var(--pri)', fontWeight: 600, fontSize: TYPE.base, display: 'inline-flex', gap: 4, alignItems: 'center' }}
          >
            <Maximize2 size={14} strokeWidth={2} aria-hidden />
            {frasi.lisSchermo}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
          <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.lisFormatoCarta}</span>
          <Segmented
            label={frasi.lisFormatoCarta}
            fill
            value={format}
            onChange={(formato) => persistOpzioni({ formato })}
            options={[
              { value: 'A4', label: 'A4' },
              { value: 'A3', label: 'A3' },
            ]}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SIZES.field.gap }}>
          <span style={{ fontSize: SIZES.field.label, fontWeight: 600, color: 'var(--tx2)' }}>{frasi.lisTipoFile}</span>
          <Segmented
            label={frasi.lisTipoFile}
            fill
            value={tipoFile}
            onChange={(next) => persistOpzioni({ tipoFile: next })}
            options={[
              { value: 'pdf', label: 'PDF' },
              { value: 'jpeg', label: frasi.lisJpeg },
            ]}
          />
        </div>
        <Card>
          <Row style={{ borderTop: 0 }}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setLinguaAperta(true)}
              style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 8, border: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'left', padding: 0, minHeight: 44, width: '100%' }}
            >
              <span style={{ flex: 1 }}>{frasi.linguaListino}</span>
              <span style={{ color: 'var(--tx2)', fontWeight: 650 }}>{NOMI_LINGUA[linguaFoglio]}</span>
            </button>
          </Row>
          <Row>
            <span style={{ flex: 1 }}>{frasi.lisAPartire}</span>
            <Toggle
              checked={sheet.opzioni.scriviAPartireDa}
              onChange={(scriviAPartireDa) => persistOpzioni({ scriviAPartireDa })}
              label={frasi.lisAPartire}
            />
          </Row>
        </Card>
        <div style={{ textAlign: 'center', fontSize: TYPE.meta, color: 'var(--tx3)' }}>
          {fit}
        </div>
      </div>
      <div
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--line)',
          boxShadow: 'var(--sh-foot)',
          padding: `${SIZES.sheet.footer.padTop}px ${SIZES.sheet.footer.padX}px ${SIZES.sheet.footer.padBottom}px`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.3fr',
          gap: SIZES.sheet.footer.gap,
        }}
      >
        <Button variant="secondary" disabled={busy} onClick={() => void run('print')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Printer size={14} strokeWidth={2} aria-hidden />
          {frasi.lisStampaBtn}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void run('download')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Download size={14} strokeWidth={2} aria-hidden />
          {frasi.lisScarica}
        </Button>
        <Button disabled={busy} onClick={() => void run('share')} style={{ display: 'inline-flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <Share2 size={14} strokeWidth={2} aria-hidden />
          {frasi.lisCondividi}
        </Button>
      </div>
      {full ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#111', display: 'flex', flexDirection: 'column' }}>
          <button
            type="button"
            aria-label={frasi.chiudi}
            onClick={() => setFull(false)}
            style={{ alignSelf: 'flex-end', margin: 10, border: 0, background: 'rgba(255,255,255,.12)', color: 'var(--on-pri)', width: 44, height: 44, borderRadius: 22, display: 'grid', placeItems: 'center' }}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
          <button
            ref={frameRef}
            type="button"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            style={{ flex: 1, overflow: 'hidden', border: 0, padding: 0, background: 'transparent', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div
              style={{
                width: shownW,
                height: shownH,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center',
              }}
            >
              <div
                ref={fullPaperRef}
                style={{
                  width: paperW,
                  transform: `scale(${fitScale})`,
                  transformOrigin: 'top left',
                }}
              >
                <PriceSheetPaper sheet={sheet} logoSrc={logoSrc} format={format} lingua={linguaFoglio} />
              </div>
            </div>
          </button>
        </div>
      ) : null}
      <Dialog open={linguaAperta} title={frasi.linguaListino} onClose={() => setLinguaAperta(false)}>
        <div role="radiogroup" aria-label={frasi.linguaListino} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(['it', 'en', 'es'] as const).map((codice) => {
            const selected = codice === linguaFoglio
            return (
              <button
                key={codice}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => persistOpzioni({ lingua: codice })}
                style={{
                  minHeight: 48,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderRadius: 12,
                  border: selected ? '2px solid var(--pri)' : '1px solid var(--line)',
                  background: selected ? 'var(--pri-s)' : 'var(--surf)',
                  color: 'var(--tx)',
                  font: 'inherit',
                  fontWeight: 650,
                  padding: '0 12px',
                  textAlign: 'left',
                }}
              >
                <span style={{ flex: 1 }}>{NOMI_LINGUA[codice]}</span>
                {selected ? <Check size={16} strokeWidth={2} aria-hidden /> : null}
              </button>
            )
          })}
        </div>
      </Dialog>
    </PhoneShell>
  )
}
