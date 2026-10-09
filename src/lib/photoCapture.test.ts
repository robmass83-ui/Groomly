import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardCaptureClick } from './photoCapture'

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}))

vi.mock('@capacitor/camera', () => ({
  Camera: { requestPermissions: vi.fn() },
}))

function fileInput() {
  const input = document.createElement('input')
  input.click = vi.fn()
  return input
}

describe('guardCaptureClick', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Camera.requestPermissions).mockReset()
  })

  it('fuori dal nativo non chiede il permesso e non blocca il click', () => {
    const preventDefault = vi.fn()
    const input = fileInput()
    guardCaptureClick({ currentTarget: input, preventDefault }, vi.fn())
    expect(Camera.requestPermissions).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
    expect(input.click).not.toHaveBeenCalled()
  })

  it('sul nativo lascia il gesto originale e chiede il permesso senza attendere', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    let settled = false
    vi.mocked(Camera.requestPermissions).mockImplementation(() => new Promise((resolve) => {
      queueMicrotask(() => {
        settled = true
        resolve({ camera: 'granted', photos: 'granted' })
      })
    }))
    const preventDefault = vi.fn()
    const onDenied = vi.fn()
    const input = fileInput()
    guardCaptureClick({ currentTarget: input, preventDefault }, onDenied)
    expect(settled).toBe(false)
    expect(preventDefault).not.toHaveBeenCalled()
    expect(input.click).not.toHaveBeenCalled()
    expect(Camera.requestPermissions).toHaveBeenCalledTimes(1)
    expect(onDenied).not.toHaveBeenCalled()
  })

  it('se la fotocamera è negata avvisa e non rilancia il click', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Camera.requestPermissions).mockResolvedValue({ camera: 'denied', photos: 'denied' })
    const preventDefault = vi.fn()
    const onDenied = vi.fn()
    const input = fileInput()
    guardCaptureClick({ currentTarget: input, preventDefault }, onDenied)
    expect(preventDefault).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(onDenied).toHaveBeenCalledTimes(1))
    expect(input.click).not.toHaveBeenCalled()
    expect(preventDefault).not.toHaveBeenCalled()
  })
})
