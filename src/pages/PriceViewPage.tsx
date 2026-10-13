import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import type { PriceFile, SettingsMain } from '../data/local/settings'
import { useSession } from '../hooks/useSession'
import { useSettings } from '../hooks/useSettings'
import { openPdf } from '../lib/openDocument'
import { pinchScale } from '../lib/pinchScale'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import { ShellFrame } from './ShellFrame'

function findPrice(settings: SettingsMain | null, id: string | null): PriceFile | undefined {
  if (!settings) return undefined
  if (!id) return settings.priceList
  if (settings.priceList?.id === id) return settings.priceList
  return settings.priceListHistory.find((item) => item.id === id)
}

function fingerDistance(touches: ArrayLike<{ clientX: number; clientY: number }>): number {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  return Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)
}

const noteStyle = { margin: 0, color: 'var(--tx3)', fontSize: TYPE.base } as const

export function PriceViewPage() {
  const [params] = useSearchParams()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const { settings: stored } = useSettings()
  const settings = uid ? stored : null
  const file = findPrice(settings, params.get('id'))
  const [scale, setScale] = useState(1)
  const [imageBroken, setImageBroken] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const scaleRef = useRef(1)
  const gesture = useRef({ distance: 0, scale: 1 })

  useEffect(() => {
    scaleRef.current = 1
    gesture.current = { distance: 0, scale: 1 }
    setScale(1)
    setImageBroken(false)
    setPdfError(null)
  }, [file?.id, file?.dataUrl, file?.mime])

  useEffect(() => {
    if (!file || file.mime !== 'application/pdf') return
    let active = true
    openPdf(file.dataUrl).catch((error: unknown) => {
      if (!active) return
      setPdfError(error instanceof Error ? error.message : 'File non apribile')
    })
    return () => {
      active = false
    }
  }, [file?.dataUrl, file?.mime])

  function rememberScale(next: number) {
    scaleRef.current = next
    setScale(next)
  }

  function onTouchStart(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length < 2) return
    const distance = fingerDistance(event.touches)
    gesture.current = { distance, scale: scaleRef.current }
    rememberScale(pinchScale(distance, distance, scaleRef.current))
  }

  function onTouchMove(event: TouchEvent<HTMLButtonElement>) {
    if (event.touches.length < 2) return
    if (gesture.current.distance <= 0) {
      gesture.current = { distance: fingerDistance(event.touches), scale: scaleRef.current }
    }
    rememberScale(pinchScale(gesture.current.distance, fingerDistance(event.touches), gesture.current.scale))
  }

  const image = file?.mime.startsWith('image/') === true
  const pdf = file?.mime === 'application/pdf'
  return (
    <ShellFrame>
      <Header title="Listino" backTo="/listino" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 24px` }}>
        {!file ? (
          <p style={noteStyle}>Nessun file</p>
        ) : image ? (
          imageBroken ? (
            <p style={noteStyle}>File non apribile</p>
          ) : (
            <button
              type="button"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              style={{ display: 'block', width: '100%', border: 'none', padding: 0, background: 'transparent', touchAction: 'none' }}
            >
              <img
                alt={file.fileName}
                src={file.dataUrl}
                onError={() => setImageBroken(true)}
                style={{ width: '100%', transform: `scale(${scale})`, transformOrigin: 'center' }}
              />
            </button>
          )
        ) : pdf ? (
          <p style={noteStyle}>{pdfError ?? file.fileName}</p>
        ) : (
          <p style={noteStyle}>File non apribile</p>
        )}
      </div>
    </ShellFrame>
  )
}
