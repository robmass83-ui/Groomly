import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

const opening = new WeakSet<HTMLInputElement>()

export function guardCaptureClick(
  event: { currentTarget: HTMLInputElement; preventDefault: () => void },
  onDenied: () => void,
): void {
  if (!Capacitor.isNativePlatform()) return
  const input = event.currentTarget
  if (input.dataset.captureReady === '1') return
  event.preventDefault()
  if (opening.has(input)) return
  opening.add(input)
  void Camera.requestPermissions()
    .then((status) => {
      if (status.camera === 'denied') onDenied()
    })
    .finally(() => {
      input.dataset.captureReady = '1'
      input.click()
      delete input.dataset.captureReady
      opening.delete(input)
    })
}
