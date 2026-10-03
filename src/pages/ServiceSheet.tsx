import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { serviceFormSchema } from '../lib/schemas'
import type { Service, ServiceInput, ServiceKind } from '../types/models'

type Props = {
  mode: 'create' | 'edit'
  initial?: Service
  onSubmit: (input: ServiceInput) => void
}

function defaults(kind: ServiceKind, initial?: Service) {
  if (kind === 'extra') {
    return {
      kind: 'extra' as const,
      name: initial?.name ?? '',
      active: initial?.active ?? true,
      durationMin: initial ? String(initial.durationMin.piccola) : '',
      price: initial ? String(initial.price.piccola).replace('.', ',') : '',
    }
  }
  return {
    kind: 'principale' as const,
    name: initial?.name ?? '',
    active: initial?.active ?? true,
    durationMin: {
      piccola: initial ? String(initial.durationMin.piccola) : '',
      media: initial ? String(initial.durationMin.media) : '',
      grande: initial ? String(initial.durationMin.grande) : '',
    },
    price: {
      piccola: initial ? String(initial.price.piccola) : '',
      media: initial ? String(initial.price.media) : '',
      grande: initial ? String(initial.price.grande) : '',
    },
  }
}

type FormApi = ReturnType<typeof useForm>

function PrincipalFields({ form }: { form: FormApi }) {
  const errors = form.formState.errors as {
    durationMin?: { piccola?: { message?: string }; media?: { message?: string }; grande?: { message?: string } }
    price?: { piccola?: { message?: string }; media?: { message?: string }; grande?: { message?: string } }
  }
  return (
    <>
      {(['piccola', 'media', 'grande'] as const).map((size) => (
        <div key={size}>
          <Input label={`Durata ${size}`} {...form.register(`durationMin.${size}`)} error={errors.durationMin?.[size]?.message} />
          <Input label={`Prezzo ${size}`} {...form.register(`price.${size}`)} error={errors.price?.[size]?.message} />
        </div>
      ))}
    </>
  )
}

function ExtraFields({ form }: { form: FormApi }) {
  const errors = form.formState.errors as {
    durationMin?: { message?: string }
    price?: { message?: string }
  }
  return (
    <>
      <Input label="Durata" {...form.register('durationMin')} error={errors.durationMin?.message} />
      <Input label="Prezzo" {...form.register('price')} error={errors.price?.message} />
    </>
  )
}

export function ServiceSheet({ mode, initial, onSubmit }: Props) {
  const kindLocked = mode === 'edit'
  const kindDefault: ServiceKind = initial?.kind ?? 'principale'
  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: defaults(kindDefault, initial),
  })
  const kind = kindLocked ? kindDefault : (form.watch('kind') as ServiceKind)

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Input label="Nome" {...form.register('name')} error={form.formState.errors.name?.message as string | undefined} />
      {mode === 'create' ? (
        <Segmented
          label="Tipo"
          value={kind}
          onChange={(value) => {
            const name = form.getValues('name')
            form.reset({ ...defaults(value), name })
          }}
          options={[{ value: 'principale', label: 'Principale' }, { value: 'extra', label: 'Extra' }]}
        />
      ) : null}
      {kind === 'principale' ? <PrincipalFields form={form} /> : <ExtraFields form={form} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Attivo</span>
        <Toggle label="Attivo" checked={Boolean(form.watch('active'))} onChange={(checked) => form.setValue('active', checked)} />
      </div>
      <Button type="submit">Salva</Button>
    </form>
  )
}
