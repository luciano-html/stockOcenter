import { Fragment, useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { cn, qtyWithUnit } from '@/lib/utils'
import type { ChairTypeWithBOM, Componente, AxiosErrorType, WorkOrder, User as Usuario } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Autocomplete } from '@/components/ui/autocomplete'
import { MultiSelectAutocomplete } from '@/components/ui/multi-select-autocomplete'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Plus, Trash2, Package, Wrench, AlertTriangle, Info, CheckCircle, User, ChevronRight } from 'lucide-react'
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
    adicionales: z.array(itemRowSchema).default([]),
    repuestos: z.array(itemRowSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.tipoOrden === 'repuestos' && data.repuestos.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Agregá al menos un repuesto' })
    }
  })

type FormData = {
  tipoOrden: 'silla' | 'repuestos'
  adicionales: { componentId: string; componentName: string; quantity: number }[]
  repuestos: { componentId: string; componentName: string; quantity: number }[]
}

interface SillaRow {
  id: string
  chairTypeId: string
  quantity: string
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

export default function OrdenTrabajoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedOperator, setSelectedOperator] = useState('')
  const [sillasRows, setSillasRows] = useState<SillaRow[]>([])
  const [multiSelected, setMultiSelected] = useState<string[]>([])
  const [sillasError, setSillasError] = useState('')

  const {
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
      adicionales: [],
      repuestos: [],
    },
  })

  const tipoOrden = watch('tipoOrden')
  const adicionalesWatched = watch('adicionales')
  const repuestosWatched = watch('repuestos')

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

      const sillas = ot.sillas && ot.sillas.length > 0
        ? ot.sillas.map((s) => ({
            id: generateId(),
            chairTypeId: s.chairTypeId._id,
            quantity: String(s.quantity),
          }))
        : ot.chairTypeId
          ? [{ id: generateId(), chairTypeId: ot.chairTypeId._id, quantity: String(ot.quantity ?? 1) }]
          : []

      setSillasRows(sillas)
      reset({
        tipoOrden: sillas.length > 0 ? 'silla' : 'repuestos',
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
        label: `${c.name} (${c.tipo}${c.marca ? ` - ${c.marca}` : ''}) — disp. ${qtyWithUnit(c.stockDisponible, c.unit)}`,
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

  const chairMap = useMemo(() => {
    const map = new Map<string, ChairTypeWithBOM>()
    tiposData?.data.forEach((t) => map.set(t._id, t))
    return map
  }, [tiposData])

  const sillaIds = useMemo(() => sillasRows.map((s) => s.chairTypeId), [sillasRows])

  const { data: bomsData } = useQuery<{ data: { chairTypeId: string; componentId: string; quantity: number }[] }>({
    queryKey: ['tipos-silla-bom', sillaIds.join(',')],
    queryFn: () => api.get('/tipos-silla/bom', { params: { ids: sillaIds.join(',') } }).then((r) => r.data),
    enabled: tipoOrden === 'silla' && sillaIds.length > 0,
  })

  const bomMap = useMemo(() => {
    const map = new Map<string, { componentId: string; quantity: number }[]>()
    bomsData?.data.forEach((item) => {
      const list = map.get(item.chairTypeId) ?? []
      list.push({ componentId: item.componentId, quantity: item.quantity })
      map.set(item.chairTypeId, list)
    })
    return map
  }, [bomsData])

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

    if (tipoOrden === 'silla') {
      sillasRows.forEach((row) => {
        const qty = Number(row.quantity) || 0
        if (qty <= 0) return
        ;(bomMap.get(row.chairTypeId) ?? []).forEach((bomItem) => {
          addReq(bomItem.componentId, qty * bomItem.quantity)
        })
      })
    }

    adicionalesWatched.forEach((item) => addReq(item.componentId, item.quantity))
    repuestosWatched.forEach((item) => addReq(item.componentId, item.quantity))

    return Array.from(map.values()).sort((a, b) => a.componente.name.localeCompare(b.componente.name))
  }, [tipoOrden, sillasRows, bomMap, adicionalesWatched, repuestosWatched, compData, componentMap])

  const faltantes = requerimientos.filter((r) => r.necesario > r.componente.stockDisponible)
  const hayStockSuficiente = faltantes.length === 0

  function addMultiSelectedToSillas() {
    const existingIds = new Set(sillasRows.map((s) => s.chairTypeId))
    const newRows = multiSelected
      .filter((id) => !existingIds.has(id))
      .map((id) => ({ id: generateId(), chairTypeId: id, quantity: '1' }))

    if (newRows.length === 0) {
      setSillasError('Los tipos de silla seleccionados ya están en la orden')
      setTimeout(() => setSillasError(''), 3000)
      return
    }

    setSillasRows((prev) => [...prev, ...newRows])
    setMultiSelected([])
    setSillasError('')
  }

  function updateSillaQuantity(sillaId: string, value: string) {
    setSillasRows((prev) => prev.map((s) => (s.id === sillaId ? { ...s, quantity: value } : s)))
  }

  function removeSilla(sillaId: string) {
    setSillasRows((prev) => prev.filter((s) => s.id !== sillaId))
  }

  const sillasLabel = useMemo(
    () =>
      sillasRows
        .map((s) => `${chairMap.get(s.chairTypeId)?.name ?? 'Silla'} x${s.quantity || 0}`)
        .join(', '),
    [sillasRows, chairMap]
  )

  const buildPayload = (form: FormData) => ({
    sillas:
      form.tipoOrden === 'silla'
        ? sillasRows.map((s) => ({ chairTypeId: s.chairTypeId, quantity: Number(s.quantity) }))
        : undefined,
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
        : api.post('/ordenes-trabajo', { ...payload, assignedTo: selectedOperator || undefined })
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

  const { data: usuariosData } = useQuery<{ data: Usuario[] }>({
    queryKey: ['usuarios', 'asignar'],
    queryFn: () => api.get('/auth/usuarios', { params: { limit: 1000 } }).then((r) => r.data),
    enabled: !isEditing,
  })

  const empleados = (usuariosData?.data ?? []).filter((u) => u.role === 'operario')

  function validateSillas(): string | null {
    if (tipoOrden === 'silla' && sillasRows.length === 0) {
      return 'Agregá al menos un tipo de silla'
    }
    for (const s of sillasRows) {
      if (!s.quantity || Number(s.quantity) < 1) {
        return 'La cantidad de cada silla debe ser al menos 1'
      }
    }
    return null
  }

  function goToStep2(e?: React.FormEvent) {
    const error = validateSillas()
    if (error) {
      e?.preventDefault()
      setSillasError(error)
      setTimeout(() => setSillasError(''), 3000)
      return
    }
    handleSubmit(() => setStep(2))(e)
  }

  const currentForm: FormData = {
    tipoOrden,
    adicionales: adicionalesWatched,
    repuestos: repuestosWatched,
  }

  const stepLabels: Record<1 | 2 | 3, string> = {
    1: 'Selección',
    2: 'Confirmación',
    3: 'Asignar operario',
  }

  const totalSteps = isEditing ? 2 : 3
  const steps = [1, 2, 3].slice(0, totalSteps).map((n) => ({
    n: n as 1 | 2 | 3,
    label: stepLabels[n as 1 | 2 | 3],
  }))

  const rootError =
    (errors.root?.message as string | undefined) ??
    (errors as Record<string, { message?: string }>)['']?.message

  if (loadingTipos || (isEditing && loadingOrder)) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack to="/ordenes-trabajo" />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {steps.map((s, idx) => (
              <Fragment key={s.n}>
                {idx > 0 && <ChevronRight size={14} className="text-muted-foreground" />}
                <button
                  type="button"
                  disabled={s.n >= step}
                  onClick={() => setStep(s.n)}
                  className={cn(
                    'rounded-full px-3 py-1 border text-xs font-medium transition-colors',
                    s.n === step
                      ? 'bg-green-600 text-white border-green-600'
                      : s.n < step
                        ? 'bg-background border-border text-foreground hover:bg-muted cursor-pointer'
                        : 'bg-muted/50 border-border text-muted-foreground cursor-default'
                  )}
                >
                  {s.n}. {s.label}
                </button>
              </Fragment>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={step === 1 ? goToStep2 : (e) => e.preventDefault()} className="space-y-6">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="tipoOrden">Tipo de orden</Label>
              <Select id="tipoOrden" value={tipoOrden} onChange={(e) => { setValue('tipoOrden', e.target.value as 'silla' | 'repuestos'); setSillasRows([]); setValue('adicionales', []) }}>
                <option value="silla">Silla + adicionales</option>
                <option value="repuestos">Solo repuestos</option>
              </Select>
            </div>

            {tipoOrden === 'silla' && (
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
                  <div className="flex-1 w-full">
                    <MultiSelectAutocomplete
                      options={tipoSillaOptions}
                      selected={multiSelected}
                      onChange={setMultiSelected}
                      placeholder="Escribí para filtrar y marcá con checkbox..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full lg:w-auto whitespace-nowrap"
                    disabled={multiSelected.length === 0}
                    onClick={addMultiSelectedToSillas}
                  >
                    <Plus size={16} className="mr-1" />
                    Agregar {multiSelected.length > 0 ? `${multiSelected.length}` : ''}
                  </Button>
                </div>

                {sillasError && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/50 p-3 text-sm text-destructive">
                    {sillasError}
                  </div>
                )}

                {sillasRows.length > 0 && (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de silla</TableHead>
                          <TableHead className="w-32">Cantidad</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sillasRows.map((row) => {
                          const chair = chairMap.get(row.chairTypeId)
                          const posibles = chair?.sillasPosibles ?? 0
                          const qty = Number(row.quantity) || 0
                          const excede = qty > posibles
                          return (
                            <TableRow key={row.id}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{chair?.name ?? 'Tipo de silla'}</span>
                                  <p className={cn('text-xs', excede ? 'text-destructive' : 'text-muted-foreground')}>
                                    {excede
                                      ? `Con el stock actual solo se pueden fabricar ${posibles} silla(s)`
                                      : `Stock para fabricar hasta ${posibles} silla(s)`}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="Cantidad"
                                  value={row.quantity}
                                  onChange={(e) => updateSillaQuantity(row.id, e.target.value.replace(/\D/g, ''))}
                                />
                              </TableCell>
                              <TableCell className="align-top">
                                <Button variant="ghost" size="icon" onClick={() => removeSilla(row.id)} aria-label="Quitar tipo de silla">
                                  <Trash2 size={16} className="text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
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

            {rootError && <p className="text-xs text-destructive">{rootError}</p>}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => navigate('/ordenes-trabajo')}>Cancelar</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                SIGUIENTE <ChevronRight size={16} />
              </Button>
            </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-muted-foreground" />
                    <Label className="text-sm font-medium">Resumen de la orden</Label>
                  </div>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo de silla</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sillasRows.length === 0 ? (
                          <TableRow>
                            <TableCell className="text-muted-foreground">Solo repuestos</TableCell>
                            <TableCell className="text-right text-muted-foreground">—</TableCell>
                          </TableRow>
                        ) : (
                          sillasRows.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell className="font-medium">{chairMap.get(row.chairTypeId)?.name ?? 'Silla'}</TableCell>
                              <TableCell className="text-right">{row.quantity}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium mb-2">Adicionales ({adicFields.length})</p>
                      {adicFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin adicionales</p>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {adicFields.map((i) => (
                            <li key={i.id}>• {i.componentName} ×{i.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-sm font-medium mb-2">Repuestos ({repFields.length})</p>
                      {repFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin repuestos</p>
                      ) : (
                        <ul className="text-sm space-y-1">
                          {repFields.map((i) => (
                            <li key={i.id}>• {i.componentName} ×{i.quantity}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

            {requerimientos.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Disponibilidad</Label>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Componente</TableHead>
                        <TableHead className="text-right">Necesario</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="text-right">Faltante</TableHead>
                        <TableHead className="text-right">Quedarían</TableHead>
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
                            <TableCell className="text-right">{qtyWithUnit(necesario, componente.unit)}</TableCell>
                            <TableCell className="text-right">{qtyWithUnit(componente.stockDisponible, componente.unit)}</TableCell>
                            <TableCell className={cn('text-right font-medium', !ok && 'text-destructive')}>
                              {faltante > 0 ? qtyWithUnit(faltante, componente.unit) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {qtyWithUnit(Math.max(0, componente.stockDisponible - necesario), componente.unit)}
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

            {rootError && <p className="text-xs text-destructive">{rootError}</p>}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Volver</Button>
              {isEditing ? (
                <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" disabled={mutation.isPending} onClick={() => mutation.mutate(currentForm)}>
                  {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              ) : (
                <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setStep(3)}>
                  SIGUIENTE <ChevronRight size={16} />
                </Button>
              )}
            </div>
              </>
            )}

            {!isEditing && step === 3 && (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted-foreground" />
                    <Label className="text-sm font-medium">Asignar operario</Label>
                  </div>
                  <Select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)}>
                    <option value="">Seleccioná un operario...</option>
                    {empleados.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
                    ))}
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {tipoOrden === 'silla' ? (sillasLabel || 'Sillas') : 'Solo repuestos'}
                    {adicFields.length > 0 && ` · ${adicFields.length} adicional(es)`}
                    {repFields.length > 0 && ` · ${repFields.length} repuesto(s)`}
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Volver</Button>
                  <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" disabled={mutation.isPending || !selectedOperator} onClick={() => mutation.mutate(currentForm)}>
                    {mutation.isPending ? 'Creando...' : 'Crear orden'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
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
  const [cantidad, setCantidad] = useState('')

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
        <Input type="text" inputMode="numeric" placeholder="Cantidad" value={cantidad}
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
