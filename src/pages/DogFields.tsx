import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { dogFormSchema } from '../lib/schemas'
import type { Dog, DogDraft, Sex } from '../types/models'

type DogFormValues = z.input<typeof dogFormSchema>

function toForm(dog?: Dog): DogFormValues {
  return {
    name: dog?.name ?? '',
    species: dog?.species ?? 'cane',
    breed: dog?.breed ?? '',
    sex: dog?.sex ?? '',
    ageCategory: dog?.ageCategory ?? 'adulto',
    size: dog?.size ?? 'piccola',
    temperament: dog?.temperament ?? 'bravo',
    clientType: dog?.clientType ?? 'occasionale',
    contactName: dog?.contact.name ?? '',
    phone: dog?.contact.phone ?? '',
    notes: dog?.notes ?? '',
    criticalNote: dog?.criticalNote ?? '',
  }
}

export function DogFields({ initial, onSubmit }: { initial?: Dog; onSubmit: (draft: DogDraft) => void }) {
  const form = useForm<DogFormValues, unknown, DogDraft>({
    resolver: zodResolver(dogFormSchema) as Resolver<DogFormValues, unknown, DogDraft>,
    defaultValues: toForm(initial),
  })
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Input label="Nome" {...form.register('name')} error={form.formState.errors.name?.message} />
      <Segmented label="Specie" value={form.watch('species')} onChange={(value) => form.setValue('species', value)} options={[{ value: 'cane', label: 'Cane' }, { value: 'gatto', label: 'Gatto' }, { value: 'altro', label: 'Altro' }]} />
      <Input label="Razza" {...form.register('breed')} />
      <Segmented<'' | Sex> label="Sesso" value={form.watch('sex')} onChange={(value) => form.setValue('sex', value)} options={[{ value: 'M', label: 'Maschio' }, { value: 'F', label: 'Femmina' }]} />
      <Segmented label="Categoria" value={form.watch('ageCategory')} onChange={(value) => form.setValue('ageCategory', value)} options={[{ value: 'cucciolo', label: 'Cucciolo' }, { value: 'giovane', label: 'Giovane' }, { value: 'adulto', label: 'Adulto' }, { value: 'anziano', label: 'Anziano' }]} />
      <Segmented label="Taglia" value={form.watch('size')} onChange={(value) => form.setValue('size', value)} options={[{ value: 'piccola', label: 'Piccola' }, { value: 'media', label: 'Media' }, { value: 'grande', label: 'Grande' }]} />
      <Segmented label="Carattere" value={form.watch('temperament')} onChange={(value) => form.setValue('temperament', value)} options={[{ value: 'bravo', label: 'Bravo' }, { value: 'agitato', label: 'Agitato' }, { value: 'mordace', label: 'Mordace' }]} />
      <Segmented label="Tipo cliente" value={form.watch('clientType')} onChange={(value) => form.setValue('clientType', value)} options={[{ value: 'mensile', label: 'Mensile' }, { value: 'occasionale', label: 'Occasionale' }]} />
      <Input label="Proprietario" {...form.register('contactName')} />
      <Input label="Telefono" {...form.register('phone')} error={form.formState.errors.phone?.message} />
      <Input label="Nota" {...form.register('notes')} />
      <Input label="Avviso critico" {...form.register('criticalNote')} />
      <Button type="submit">Salva</Button>
    </form>
  )
}
