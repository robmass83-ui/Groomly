import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { Camera as IconaFotocamera, Image as IconaGalleria } from 'lucide-react'
import { useCallback, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useFrasi } from '../i18n/LinguaContext'
import { Dialog } from './layout/Dialog'
import { useToast } from './layout/Toast'

const nascosto = { display: 'none' } as const

function Voce({ label, icon, onClick }: { label: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        margin: 0,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        boxShadow: 'var(--sh-1)',
        color: 'var(--tx)',
        font: 'inherit',
        textAlign: 'left',
        padding: '12px',
        borderRadius: 14,
      }}
    >
      <span aria-hidden style={{ width: 40, height: 40, borderRadius: 13, flex: 'none', display: 'grid', placeItems: 'center', color: 'var(--pri)', background: 'var(--pri-s)' }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5, lineHeight: 1.2 }}>{label}</span>
    </button>
  )
}

export function useScegliFoto({ etichetta, onFile }: { etichetta: string; onFile: (file: File | undefined) => void }) {
  const frasi = useFrasi()
  const toast = useToast()
  const nativo = Capacitor.isNativePlatform()
  const [aperto, setAperto] = useState(false)
  const galleriaRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement | null>(null)
  const avvisoRef = useRef<() => void>(() => undefined)
  avvisoRef.current = () => toast.show(frasi.schedaPermessoFoto, 'plain')
  // L'evento cancel dell'input esiste da Chromium 113: sui WebView più vecchi il permesso negato non avvisa.
  const annullata = useCallback(() => {
    void Camera.checkPermissions()
      .then((stato) => {
        if (stato.camera !== 'granted') avvisoRef.current()
      })
      .catch(() => undefined)
  }, [])

  const collegaCamera = useCallback((input: HTMLInputElement | null) => {
    cameraRef.current?.removeEventListener('cancel', annullata)
    cameraRef.current = input
    input?.addEventListener('cancel', annullata)
  }, [annullata])

  function scelto(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    input.value = ''
    onFile(file)
  }

  const apri = () => {
    if (nativo) setAperto(true)
    else galleriaRef.current?.click()
  }
  const scatta = () => {
    setAperto(false)
    cameraRef.current?.click()
  }
  const galleria = () => {
    setAperto(false)
    galleriaRef.current?.click()
  }

  const elementi = (
    <>
      <input ref={galleriaRef} type="file" accept="image/*" aria-label={etichetta} onChange={scelto} style={nascosto} />
      <input ref={collegaCamera} type="file" accept="image/*" capture="environment" aria-hidden tabIndex={-1} onChange={scelto} style={nascosto} />
      <Dialog open={aperto} title={frasi.fotoScegliTitolo} onClose={() => setAperto(false)} portal>
        <Voce label={frasi.fotoScatta} icon={<IconaFotocamera size={20} strokeWidth={2} />} onClick={scatta} />
        <Voce label={frasi.fotoGalleria} icon={<IconaGalleria size={20} strokeWidth={2} />} onClick={galleria} />
      </Dialog>
    </>
  )

  return { nativo, apri, scatta, galleria, elementi }
}
