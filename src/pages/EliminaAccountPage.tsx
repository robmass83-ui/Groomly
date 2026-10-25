import { useFrasi } from '../i18n/LinguaContext'

export function EliminaAccountPage() {
  const frasi = useFrasi()
  return (
    <main style={{ padding: 16 }}>
      <h1>{frasi.eliminaAccount}</h1>
      <p>{frasi.accTesto}</p>
    </main>
  )
}
