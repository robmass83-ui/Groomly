import { useFrasi } from '../i18n/LinguaContext'

export function PrivacyPage() {
  const frasi = useFrasi()
  return (
    <main style={{ padding: 16 }}>
      <h1>{frasi.privacy}</h1>
      <p>{frasi.prvTesto}</p>
    </main>
  )
}
