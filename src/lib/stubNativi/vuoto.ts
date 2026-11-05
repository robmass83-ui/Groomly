// Nel sito admin i plugin nativi non esistono: Vite punta qui. Nessuno li chiama, perché ogni uso è dietro `Capacitor.isNativePlatform()`.
const assente = new Proxy({}, { get: () => () => Promise.reject(new Error('plugin nativo assente')) })

export const LocalNotifications = assente
export const PushNotifications = assente
export const Filesystem = assente
export const Share = assente
export const Camera = assente
export const Browser = assente
export const App = assente
export const FileViewer = assente
export const Purchases = assente
export const Directory = { Cache: 'CACHE', Documents: 'DOCUMENTS', Data: 'DATA' }
export const Encoding = { UTF8: 'utf8' }
export const CameraResultType = {}
export const CameraSource = {}
