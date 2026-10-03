import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { DogAvatar } from '../components/domain/DogAvatar'
import { Header } from '../components/layout/Header'
import { PhoneShell } from '../components/layout/PhoneShell'
import { useToast } from '../components/layout/Toast'
import { Button } from '../components/ui/Button'
import { useSession } from '../hooks/useSession'
import { useDogs } from '../hooks/useDogs'
import { AGE_LABEL, ARCHIVE_LABEL, CLIENT_LABEL, SEX_LABEL, SIZE_LABEL, SPECIES_LABEL, TEMPERAMENT_LABEL } from '../lib/dogList'
import { prepareDogPhoto } from '../lib/dogPhoto'
import { SIZES } from '../theme/sizes'
import { TYPE } from '../theme/theme'
import type { Dog, DogDraft, DogWrite } from '../types/models'
import { DogFields } from './DogFields'

function statusLine(status: Dog['status']): string | null {
  if (status === 'attivo') return null
  return ARCHIVE_LABEL[status]
}

export function DogPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const toast = useToast()
  const session = useSession()
  const uid = session.gate.kind === 'in' ? session.gate.account.uid : ''
  const api = useDogs(uid)
  const dog = id ? api.dogs.find((item) => item.id === id) : undefined
  const [editing, setEditing] = useState(isNew)
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [photoError, setPhotoError] = useState<string | null>(null)

  useEffect(() => {
    setEditing(isNew)
  }, [isNew, id])

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      setPhoto(await prepareDogPhoto(file))
      setPhotoError(null)
    } catch {
      setPhotoError('Foto non utilizzabile')
    }
  }

  function save(draft: DogDraft) {
    const write: DogWrite = { ...draft, photo: photo ?? dog?.photo }
    const ok = dog ? api.saveExisting(dog.id, write) : api.saveNew(write)
    if (!ok) {
      toast.show('Salvataggio non riuscito', 'plain')
      return
    }
    toast.show('Salvato', 'ok')
    if (!dog && api.lastCreatedId.current) {
      navigate(`/animali/${api.lastCreatedId.current}`, { replace: true })
      return
    }
    setEditing(false)
    setPhoto(undefined)
  }

  function changeStatus(action: () => boolean) {
    if (!action()) toast.show('Salvataggio non riuscito', 'plain')
  }

  if (id && !dog) {
    return (
      <PhoneShell>
        <Header title="Scheda" backTo="/animali" />
        <p style={{ padding: `0 ${SIZES.pagePadX}px`, color: 'var(--tx3)' }}>Cane assente</p>
      </PhoneShell>
    )
  }

  const line = dog ? statusLine(dog.status) : null

  return (
    <PhoneShell>
      <Header title={dog ? 'Scheda' : 'Nuovo cane'} backTo="/animali" />
      <div style={{ padding: `8px ${SIZES.pagePadX}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dog && !editing ? (
          <>
            <DogRead dog={dog} />
            {line ? <p style={{ margin: 0, color: 'var(--tx3)' }}>{line}</p> : null}
            <Button onClick={() => setEditing(true)}>Modifica</Button>
            {dog.status === 'attivo' ? (
              <>
                <Button variant="ghost" onClick={() => changeStatus(() => api.archive(dog.id, 'non_in_cura'))}>Non più in cura</Button>
                <Button variant="ghost" onClick={() => changeStatus(() => api.archive(dog.id, 'deceduto'))}>Deceduto</Button>
              </>
            ) : (
              <Button variant="ghost" onClick={() => changeStatus(() => api.restore(dog.id))}>Ripristina</Button>
            )}
          </>
        ) : (
          <>
            <DogAvatar alt="" src={photo ?? dog?.photo} size="xl" />
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: TYPE.base }}>
              Foto
              <input aria-label="Foto" type="file" accept="image/*" onChange={(event) => void onPhoto(event.target.files?.[0])} />
            </label>
            {photoError ? <p style={{ margin: 0, color: 'var(--bad)' }}>{photoError}</p> : null}
            <DogFields initial={dog} onSubmit={save} />
          </>
        )}
      </div>
    </PhoneShell>
  )
}

function DogRead({ dog }: { dog: Dog }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Nome', value: dog.name },
    { label: 'Specie', value: SPECIES_LABEL[dog.species] },
  ]
  if (dog.breed.trim()) rows.push({ label: 'Razza', value: dog.breed })
  if (dog.sex) rows.push({ label: 'Sesso', value: SEX_LABEL[dog.sex] })
  rows.push(
    { label: 'Categoria', value: AGE_LABEL[dog.ageCategory] },
    { label: 'Taglia', value: SIZE_LABEL[dog.size] },
    { label: 'Carattere', value: TEMPERAMENT_LABEL[dog.temperament] },
    { label: 'Tipo cliente', value: CLIENT_LABEL[dog.clientType] },
  )
  if (dog.contact.name.trim()) rows.push({ label: 'Proprietario', value: dog.contact.name })
  rows.push({ label: 'Telefono', value: dog.contact.phone })
  if (dog.notes) rows.push({ label: 'Nota', value: dog.notes })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <DogAvatar alt="" src={dog.photo} size="xl" />
      {dog.criticalNote ? <p style={{ margin: 0, color: 'var(--bad)', background: 'var(--bad-s)', borderRadius: 8, padding: 8 }}>{dog.criticalNote}</p> : null}
      {rows.map((row) => (
        <div key={row.label}>
          <div style={{ color: 'var(--tx3)', fontSize: TYPE.meta }}>{row.label}</div>
          {row.label === 'Telefono' ? <a href={`tel:${row.value}`}>{row.value}</a> : <div style={{ fontSize: TYPE.base }}>{row.value}</div>}
        </div>
      ))}
    </div>
  )
}
