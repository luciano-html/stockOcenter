import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { cn } from '@/lib/utils'
import type { ChairTypeWithBOM, Componente, AxiosErrorType, WorkOrder } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Autocomplete } from '@/components/ui/autocomplete'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Plus, Trash2, Package, Wrench, AlertTriangle, Info, CheckCircle } from 'lucide-react'
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
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
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

  const { data: tiposData, isLoading: loadingTipos } = useQuery<{ data: ChairTypeWithBOM[] }>({
    queryKey: ['tipos-silla-select'],
    queryFn: () => api.get('/tipos-silla', { params: { limit: 100 } }).then((r) => r.data),
  })

  const { data: compData } = useQuery<Componente[]>({
    queryKey: ['componentes', 'ot-form'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data.data),
  })

  const { data: orderData, isLoading: loadingOrder } = useQuery<{ data: WorkOrder }>({
    queryKey: ['orden-trabajo', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}`).then((r) => r.data),
    enabled: isEditing,
  })

  const componentMap = useMemo(() => {
    const map = new Map<string, Componente>()
    compData?.forEach((c) => map.set(c._id, c))
    return map
  }, [compData])

  useEffect(() => {
    if (isEditing && orderData?.data && compData) {
      const ot = orderData.data
      const items = ot.items ?? []
      const adicionales = items
        .filter((i) => i.type === 'adicional')
        .map((i) => {
          const comp = componentMap.get(i.componentId as unknown as string)
          return {
            componentId: i.componentId as unknown as string,
            componentName: comp?.name ?? '',
            quantity: i.quantity,
          }
        })
      const repuestos = items
        .filter((i) => i.type === 'repuesto')
        .map((i) => {
          const comp = componentMap.get(i.componentId as unknown as string)
          return {
            componentId: i.componentId as unknown as string,
            componentName: comp?.name ?? '',
            quantity: i.quantity,
          }
        })

      reset({
        tipoOrden: ot.chairTypeId ? 'silla' : 'repuestos',
        chairTypeId: ot.chairTypeId?._id,
        quantity: ot.quantity,
        adicionales,
        repuestos,
      })
    }
  }, [isEditing, orderData, compData, componentMap, reset])

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

  const tipoSillaOptions = useMemo(() => {
    const activos = (tiposData?.data ?? [])
      .filter((t) => t.active)
      .sort((a, b) => {
        const aPosibles = a.sillasPosibles ?? 0
        const bPosibles = b.sillasPosibles ?? 0
        if (aPosibles > 0 && bPosibles === 0) return -1
        if (aPosibles === 0 && bPosibles > 0) return 1
        if (aPosibles > 0 && bPosibles > 0) return bPosibles - aPosibles
        return a.name.localeCompare(b.name)
      })
    return activos.map((t) => ({
      value: t._id,
      label: `${t.name} (${t.sillasPosibles ?? 0} posibles)`,
    }))
  }, [tiposData])

  const selectedChairName = useMemo(
    () => tipoSillaOptions.find((t) => t.value === chairTypeId)?.label ?? '',
    [tipoSillaOptions, chairTypeId]
  )

  const selectedChair = useMemo(
    () => tiposData?.data.find((t) => t._id === chairTypeId),
    [tiposData, chairTypeId]
  )

  const sillasPosibles = selectedChair?.sillasPosibles ?? 0
  const excedeCapacidad = tipoOrden === 'silla' && chairTypeId && (Number(quantity) || 0) > sillasPosibles

  const requerimientos = useMemo(() => {
    if (!compData) return []
    const map = new Map<string, { componente: Componente; necesario: number }>()

    function addReq(componentId: string, qty: number) {
      const comp = componentMap.get(componentId)
      if (!comp || qty <= 0) return
      const current = map.get(componentId) ?? { componente: comp, necesario: 0 }
      current.necesario += qty
      map.set(componentId, current)
    }

    if (tipoOrden === 'silla' && selectedChair?.bom) {
      selectedChair.bom.forEach((bomItem) => {
        const compId = typeof bomItem.componentId === 'string' ? bomItem.componentId : bomItem.componentId._id
        addReq(compId, (Number(quantity) || 0) * bomItem.quantity)
      })
    }

    adicFields.forEach((item) => addReq(item.componentId, item.quantity))
    repFields.forEach((item) => addReq(item.componentId, item.quantity))

    return Array.from(map.values()).sort((a, b) => a.componente.name.localeCompare(b.componente.name))
  }, [tipoOrden, selectedChair, quantity, adicFields, repFields, compData, componentMap])

  const faltantes = requerimientos.filter((r) => r.necesario > r.componente.stockDisponible)
  const hayStockSuficiente = faltantes.length === 0

  const buildPayload = (form: FormData) => ({
    ...(form.tipoOrden === 'silla' && form.chairTypeId ? { chairTypeId: form.chairTypeId } : {}),
    quantity: form.quantity,
    items: [
      ...form.adicionales.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'adicional' as const })),
      ...form.repuestos.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'repuesto' as const })),
    ],
  })

  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const payload = buildPayload(form)
      return isEditing
        ? api.patch(`/ordenes-trabajo/${id}`, payload)
        : api.post('/ordenes-trabajo', payload)
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['componentes'] })
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      navigate(`/ordenes-trabajo/${res.data.data._id}`)
    },
    onError: (err: AxiosErrorType) => {
      alert(err?.response?.data?.error?.message ?? `Error al ${isEditing ? 'guardar' : 'crear'} la orden`)
    },
  })

  const onSubmit = handleSubmit(() => setShowConfirm(true))

  if (loadingTipos || (isEditing && loadingOrder)) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack />
      <Card className="max-w-2xl mx-auto">
        <CardHeader><CardTitle>{isEditing ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}</CardTitle></CardHeader>
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

            {requerimientos.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Disponibilidad</Label>
                </div>

                {tipoOrden === 'silla' && chairTypeId && (
                  <div className={cn(
                    'rounded-md border p-3 text-sm',
                    excedeCapacidad ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-green-50 border-green-200 text-green-900'
                  )}>
                    <div className="flex items-center gap-2">
                      {excedeCapacidad ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                      <span className="font-medium">
                        {excedeCapacidad
                          ? `Con el stock actual solo se pueden fabricar ${sillasPosibles} silla(s).`
                          : `Stock suficiente para fabricar hasta ${sillasPosibles} silla(s).`}
                      </span>
                    </div>
                  </div>
                )}

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Componente</TableHead>
                        <TableHead className="text-right">Necesario</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Faltante</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requerimientos.map(({ componente, necesario }) => {
                        const faltante = Math.max(0, necesario - componente.stockDisponible)
                        const ok = faltante === 0
                        return (
                          <TableRow key={componente._id}>
                            <TableCell className="font-medium">{componente.name}</TableCell>
                            <TableCell className="text-right">{necesario} {componente.unit}</TableCell>
                            <TableCell className="text-right">{componente.stockDisponible} {componente.unit}</TableCell>
                            <TableCell className={cn('text-right font-medium', !ok && 'text-destructive')}>
                              {faltante > 0 ? `${faltante} ${componente.unit}` : '—'}
                            </TableCell>
                            <TableCell>
                              {ok
                                ? <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50"><CheckCircle size={12} className="mr-1" /> OK</Badge>
                                : <Badge variant="destructive"><AlertTriangle size={12} className="mr-1" /> Falta</Badge>}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {!hayStockSuficiente && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <span>La orden no se podrá iniciar hasta cargar stock de los componentes marcados. Podés guardarla como pendiente y avisar al área de compras.</span>
                  </div>
                )}
              </div>
            )}

            {errors.root && <p className="text-xs text-destructive">{errors.root.message}</p>}

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/ordenes-trabajo')}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {mutation.isPending ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear orden')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>{isEditing ? '¿Guardar cambios?' : '¿Crear orden de trabajo?'}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {tipoOrden === 'silla'
            ? `Orden por ${quantity} silla${(Number(quantity) !== 1 ? 's' : '')} ${selectedChairName}.`
            : 'Orden de solo repuestos.'}
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
