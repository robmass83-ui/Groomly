import { Camera } from '@capacitor/camera'
import { Capacitor } from '@capacitor/core'

export function guardCaptureClick(
  event: { currentTarget: HTMLInputElement; preventDefault: () => void },
  onDenied: () => void,
): void {
  void event
  if (!Capacitor.isNativePlatform()) return
  void Camera.requestPermissions()
    .then((status) => {
      if (status.camera === 'denied') onDenied()
    })
    .catch(() => undefined)
}
