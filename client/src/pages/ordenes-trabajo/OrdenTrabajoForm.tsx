import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import type { ChairType, Componente, AxiosErrorType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Plus, Trash2, Package, Wrench } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

const itemRowSchema: z.ZodType<
  { componentId: string; componentName: string; quantity: number },
  any,
  any
> = z.object({
  componentId: z.string().min(1, 'Seleccioná un componente'),
  componentName: z.string(),
  quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
})

const schema: z.ZodType<FormData, any, any> = z
  .object({
    tipoOrden: z.enum(['silla', 'repuestos']),
    chairTypeId: z.string().optional(),
    quantity: z.coerce.number().int().min(1, 'Mínimo 1'),
    adicionales: z.array(itemRowSchema).default([]),
    repuestos: z.array(itemRowSchema).default([]),
  })
  .refine(
    (data) => {
      if (data.tipoOrden === 'silla') return !!data.chairTypeId
      return data.repuestos.length > 0
    },
    { message: 'Seleccioná un tipo de silla o agregá al menos un repuesto' }
  )

type FormData = {
  tipoOrden: 'silla' | 'repuestos'
  chairTypeId?: string
  quantity: number
  adicionales: { componentId: string; componentName: string; quantity: number }[]
  repuestos: { componentId: string; componentName: string; quantity: number }[]
}

export default function OrdenTrabajoForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipoOrden: 'silla',
      quantity: 1,
      adicionales: [],
      repuestos: [],
    },
  })

  const tipoOrden = watch('tipoOrden')
  const chairTypeId = watch('chairTypeId')
  const quantity = watch('quantity')

  const { data: tiposData, isLoading } = useQuery<{ data: ChairType[] }>({
    queryKey: ['tipos-silla-select'],
    queryFn: () => api.get('/tipos-silla').then((r) => r.data),
  })

  const { data: compData } = useQuery<Componente[]>({
    queryKey: ['componentes', 'ot-form'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data.data),
  })

  const {
    fields: adicFields,
    append: appendAdic,
    remove: removeAdic,
  } = useFieldArray({ control, name: 'adicionales' })

  const {
    fields: repFields,
    append: appendRep,
    remove: removeRep,
  } = useFieldArray({ control, name: 'repuestos' })

  const componentOptions = useMemo(
    () =>
      (compData ?? []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.tipo}${c.marca ? ` - ${c.marca}` : ''}) — disp. ${c.stockDisponible} ${c.unit}`,
      })),
    [compData]
  )

  const tipoSillaOptions = useMemo(
    () =>
      (tiposData?.data ?? [])
        .filter((t) => t.active)
        .map((t) => ({ value: t._id, label: t.name })),
    [tiposData]
  )

  const selectedChairName = useMemo(
    () => tipoSillaOptions.find((t) => t.value === chairTypeId)?.label ?? '',
    [tipoSillaOptions, chairTypeId]
  )

  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      api.post('/ordenes-trabajo', {
        ...(form.tipoOrden === 'silla' && form.chairTypeId ? { chairTypeId: form.chairTypeId } : {}),
        quantity: form.quantity,
        items: [
          ...form.adicionales.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'adicional' as const })),
          ...form.repuestos.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'repuesto' as const })),
        ],
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      navigate(`/ordenes-trabajo/${res.data.data._id}`)
    },
    onError: (err: AxiosErrorType) => {
      alert(err?.response?.data?.error?.message ?? 'Error al crear la orden')
    },
  })

  const onSubmit = handleSubmit(() => setShowConfirm(true))

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack />
      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>Nueva orden de trabajo</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="tipoOrden">Tipo de orden</Label>
              <Select id="tipoOrden" value={tipoOrden} onChange={(e) => { setValue('tipoOrden', e.target.value as 'silla' | 'repuestos'); setValue('chairTypeId', ''); setValue('adicionales', []) }}>
                <option value="silla">Silla + adicionales</option>
                <option value="repuestos">Solo repuestos</option>
              </Select>
            </div>

            {tipoOrden === 'silla' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chairTypeId">Tipo de silla</Label>
                  <Autocomplete
                    id="chairTypeId"
                    options={tipoSillaOptions}
                    value={chairTypeId ?? ''}
                    onChange={(v) => setValue('chairTypeId', v)}
                    placeholder="Buscar tipo de silla..."
                  />
                  {errors.chairTypeId && <p className="text-xs text-destructive">{errors.chairTypeId.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input id="quantity" type="text" inputMode="numeric" {...register('quantity')} />
                  {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
                </div>
              </div>
            )}

            {tipoOrden === 'silla' && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Adicionales a la silla</Label>
                  <span className="text-xs text-muted-foreground">(opcional)</span>
                </div>
                <ItemRowEditor
                  options={componentOptions}
                  onAdd={(componentId, componentName, qty) => {
                    appendAdic({ componentId, componentName, quantity: qty })
                  }}
                />
                <ItemsTable fields={adicFields} onRemove={removeAdic} />
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-muted-foreground" />
                <Label className="text-sm font-medium">Repuestos</Label>
                <span className="text-xs text-muted-foreground">{tipoOrden === 'silla' ? '(opcional)' : '(obligatorio)'}</span>
              </div>
              <ItemRowEditor
                options={componentOptions}
                onAdd={(componentId, componentName, qty) => {
                  appendRep({ componentId, componentName, quantity: qty })
                }}
              />
              <ItemsTable fields={repFields} onRemove={removeRep} />
              {errors.repuestos && <p className="text-xs text-destructive">{errors.repuestos.message}</p>}
            </div>

            {errors.root && <p className="text-xs text-destructive">{errors.root.message}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/ordenes-trabajo')}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creando...' : 'Crear orden'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>¿Crear orden de trabajo?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {tipoOrden === 'silla'
            ? `Se creará una orden por ${quantity} silla${(Number(quantity) !== 1 ? 's' : '')} ${selectedChairName}.`
            : 'Se creará una orden de solo repuestos.'}
          {adicFields.length > 0 && ` Incluye ${adicFields.length} adicional(es).`}
          {repFields.length > 0 && ` Incluye ${repFields.length} repuesto(s).`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button onClick={() => { setShowConfirm(false); handleSubmit((form) => mutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}

function ItemRowEditor({
  options,
  onAdd,
}: {
  options: { value: string; label: string }[]
  onAdd: (componentId: string, componentName: string, quantity: number) => void
}) {
  const [componentId, setComponentId] = useState('')
  const [cantidad, setCantidad] = useState('1')

  function handleAdd() {
    const comp = options.find((o) => o.value === componentId)
    if (!comp || !cantidad || Number(cantidad) < 1) return
    onAdd(comp.value, comp.label.split(' — ')[0], Number(cantidad))
    setComponentId('')
    setCantidad('1')
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <Autocomplete
          options={options}
          value={componentId}
          onChange={setComponentId}
          placeholder="Buscar componente..."
        />
      </div>
      <div className="w-24">
        <Input type="text" inputMode="numeric" placeholder="Cant." value={cantidad}
          onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))} />
      </div>
      <Button variant="outline" size="icon" onClick={handleAdd} disabled={!componentId || !cantidad || Number(cantidad) < 1}>
        <Plus size={16} />
      </Button>
    </div>
  )
}

function ItemsTable({
  fields,
  onRemove,
}: {
  fields: { id: string; componentId: string; componentName: string; quantity: number }[]
  onRemove: (index: number) => void
}) {
  if (fields.length === 0) return null
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Componente</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((item, idx) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.componentName}</TableCell>
              <TableCell>{item.quantity}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => onRemove(idx)}>
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
