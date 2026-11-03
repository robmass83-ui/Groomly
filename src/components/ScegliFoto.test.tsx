import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { it as frasi } from '../i18n/it'
import { ToastProvider } from './layout/Toast'
import { useScegliFoto } from './ScegliFoto'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('@capacitor/camera', () => ({
  Camera: { checkPermissions: vi.fn(), requestPermissions: vi.fn() },
}))

function Prova({ onFile }: { onFile: (file: File | undefined) => void }) {
  const { apri, elementi } = useScegliFoto({ etichetta: 'Foto prova', onFile })
  return (
    <>
      <button type="button" onClick={apri}>Apri</button>
      {elementi}
    </>
  )
}

function montare(onFile: (file: File | undefined) => void = vi.fn()) {
  return render(<ToastProvider><Prova onFile={onFile} /></ToastProvider>)
}

function inputCamera(container: HTMLElement) {
  return container.querySelector('input[capture]') as HTMLInputElement
}

function inputGalleria(container: HTMLElement) {
  return container.querySelector('input[type="file"]:not([capture])') as HTMLInputElement
}

describe('useScegliFoto', () => {
  let click: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Camera.checkPermissions).mockReset()
    vi.mocked(Camera.requestPermissions).mockReset()
    click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
  })

  afterEach(() => {
    click.mockRestore()
  })

  it('web: apri clicca l\'input galleria senza Dialog', () => {
    const { container } = montare()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(click.mock.instances[0]).toBe(inputGalleria(container))
    expect((click.mock.instances[0] as HTMLInputElement).hasAttribute('capture')).toBe(false)
    expect(screen.queryByText(frasi.fotoScatta)).toBeNull()
  })

  it('nativo: apri mostra Scatta foto e Scegli dalla galleria', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    montare()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    expect(screen.getByRole('button', { name: frasi.fotoScatta })).toBeTruthy()
    expect(screen.getByRole('button', { name: frasi.fotoGalleria })).toBeTruthy()
    expect(click).not.toHaveBeenCalled()
  })

  it('nativo: Scatta foto clicca l\'input con capture="environment" nello stesso tocco', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const { container } = montare()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByRole('button', { name: frasi.fotoScatta }))
    expect(click).toHaveBeenCalledTimes(1)
    const input = click.mock.instances[0] as HTMLInputElement
    expect(input).toBe(inputCamera(container))
    expect(input.getAttribute('capture')).toBe('environment')
    expect(input.accept).toBe('image/*')
    expect(Camera.requestPermissions).not.toHaveBeenCalled()
  })

  it('nativo: Scegli dalla galleria clicca l\'input senza capture', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const { container } = montare()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByRole('button', { name: frasi.fotoGalleria }))
    expect(click).toHaveBeenCalledTimes(1)
    const input = click.mock.instances[0] as HTMLInputElement
    expect(input).toBe(inputGalleria(container))
    expect(input.hasAttribute('capture')).toBe(false)
    expect(screen.queryByText(frasi.fotoGalleria)).toBeNull()
  })

  it('l\'input galleria ha aria-label = etichetta e manda il file a onFile, poi si svuota', () => {
    const onFile = vi.fn()
    const { container } = montare(onFile)
    const input = inputGalleria(container)
    expect(input.getAttribute('aria-label')).toBe('Foto prova')
    const file = new File(['x'], 'cane.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(onFile).toHaveBeenCalledWith(file)
    expect(input.value).toBe('')
  })

  it('fotocamera annullata con permesso negato mostra Permesso foto negato', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'denied', photos: 'granted' })
    const { container } = montare()
    fireEvent(inputCamera(container), new Event('cancel'))
    expect(await screen.findByText(frasi.schedaPermessoFoto)).toBeTruthy()
  })

  it('fotocamera annullata con permesso concesso non avvisa', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Camera.checkPermissions).mockResolvedValue({ camera: 'granted', photos: 'granted' })
    const { container } = montare()
    fireEvent(inputCamera(container), new Event('cancel'))
    await waitFor(() => expect(Camera.checkPermissions).toHaveBeenCalledTimes(1))
    await Promise.resolve()
    expect(screen.queryByText(frasi.schedaPermessoFoto)).toBeNull()
  })

  it('la galleria non chiama mai Camera', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    const { container } = montare()
    fireEvent.click(screen.getByRole('button', { name: 'Apri' }))
    fireEvent.click(screen.getByRole('button', { name: frasi.fotoGalleria }))
    const input = inputGalleria(container)
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] } })
    fireEvent(input, new Event('cancel'))
    await Promise.resolve()
    expect(Camera.checkPermissions).not.toHaveBeenCalled()
    expect(Camera.requestPermissions).not.toHaveBeenCalled()
  })
})
