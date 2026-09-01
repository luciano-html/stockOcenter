import { Fragment, useMemo, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/services/api'
import { cn, qtyWithUnit } from '@/lib/utils'
import type { ChairTypeWithBOM, Componente, AxiosErrorType, WorkOrder, User as Usuario, Customer } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import {
  Trash2,
  Package,
  Wrench,
  AlertTriangle,
  Info,
  CheckCircle,
  User,
  ChevronRight,
  Search,
  Building2,
  Store,
  Truck,
  MapPin,
  Calendar,
  Clock,
  CreditCard,
  FileText,
} from 'lucide-react'
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
  const [sillasError, setSillasError] = useState('')
  const [sillaCommandOpen, setSillaCommandOpen] = useState(false)
  const [adicCommandOpen, setAdicCommandOpen] = useState(false)
  const [repCommandOpen, setRepCommandOpen] = useState(false)

  // Customer Management & Search State
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerCommandOpen, setCustomerCommandOpen] = useState(false)
  const [customerState, setCustomerState] = useState({
    customerId: '',
    name: '',
    razonSocial: '',
    cuit: '',
    condicionIva: 'Consumidor Final' as 'Responsable Inscripto' | 'Consumidor Final' | 'Monotributo' | 'Exento',
    email: '',
    telefono: '',
    contacto: '',
    direccion: '',
    localidad: 'Santa Fe',
  })

  // Logistics & Branch Origin State
  const [logisticaState, setLogisticaState] = useState({
    sucursalOrigen: 'Santa Fe' as 'Santa Fe' | 'Paraná' | 'Pedido a Fábrica',
    tipoEntrega: 'Retira' as 'Retira' | 'Reparto / Flete',
    direccionEntrega: '',
    localidadEntrega: 'Santa Fe',
    plantaBaja: false,
    ascensor: false,
    escaleraEstrecha: false,
    plazoEntrega: '',
    turnoEntrega: 'Indistinto' as 'Mañana' | 'Tarde' | 'Indistinto',
  })

  // Commercial & Notes State
  const [comercialState, setComercialState] = useState({
    formaPago: '',
    observacionesFactura: '',
    observacionesReparto: '',
  })

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

  const { data: customersData } = useQuery<{ data: Customer[] }>({
    queryKey: ['customers-search', customerSearch],
    queryFn: () => api.get('/customers', { params: { search: customerSearch, limit: 30 } }).then((r) => r.data),
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
    if (isEditing && orderData?.data) {
      const ot = orderData.data
      const items = ot.items ?? []
      const adicionales = items
        .filter((i) => i.type === 'adicional')
        .map((i) => {
          const compId = typeof i.componentId === 'object' && i.componentId !== null ? (i.componentId as any)._id : i.componentId
          const compName = (typeof i.componentId === 'object' && i.componentId !== null ? (i.componentId as any).name : undefined) || componentMap.get(compId)?.name || ''
          return {
            componentId: compId,
            componentName: compName,
            quantity: i.quantity,
          }
        })
      const repuestos = items
        .filter((i) => i.type === 'repuesto')
        .map((i) => {
          const compId = typeof i.componentId === 'object' && i.componentId !== null ? (i.componentId as any)._id : i.componentId
          const compName = (typeof i.componentId === 'object' && i.componentId !== null ? (i.componentId as any).name : undefined) || componentMap.get(compId)?.name || ''
          return {
            componentId: compId,
            componentName: compName,
            quantity: i.quantity,
          }
        })

      const sillas = ot.sillas && ot.sillas.length > 0
        ? ot.sillas.map((s) => ({
            id: generateId(),
            chairTypeId: typeof s.chairTypeId === 'object' && s.chairTypeId !== null ? (s.chairTypeId as any)._id : s.chairTypeId,
            quantity: String(s.quantity),
          }))
        : ot.chairTypeId
          ? [{
              id: generateId(),
              chairTypeId: typeof ot.chairTypeId === 'object' && ot.chairTypeId !== null ? (ot.chairTypeId as any)._id : ot.chairTypeId,
              quantity: String(ot.quantity ?? 1),
            }]
          : []

      setSillasRows(sillas)
      reset({
        tipoOrden: sillas.length > 0 ? 'silla' : 'repuestos',
        adicionales,
        repuestos,
      })

      const custObj = typeof ot.customerId === 'object' && ot.customerId !== null ? (ot.customerId as any) : null
      const clientObj = (ot.cliente || {}) as any

      const custId = custObj?._id || clientObj?.customerId || (typeof ot.customerId === 'string' ? ot.customerId : '')
      const name = clientObj?.name || custObj?.name || ''
      const razonSocial = clientObj?.razonSocial || custObj?.razonSocial || name
      const cuit = clientObj?.cuit || custObj?.cuit || ''
      const condicionIva = (clientObj?.condicionIva || custObj?.condicionIva || 'Consumidor Final') as any
      const email = clientObj?.email || custObj?.email || ''
      const telefono = clientObj?.telefono || custObj?.telefono || ''
      const contacto = clientObj?.contacto || custObj?.contacto || name
      const direccion = clientObj?.domicilio || custObj?.direccion || ot.logistica?.direccionEntrega || ''
      const localidad = custObj?.localidad || ot.logistica?.localidadEntrega || 'Santa Fe'

      if (name || custId) {
        setCustomerState({
          customerId: custId || '',
          name: name || '',
          razonSocial: razonSocial || '',
          cuit: cuit || '',
          condicionIva: condicionIva || 'Consumidor Final',
          email: email || '',
          telefono: telefono || '',
          contacto: contacto || '',
          direccion: direccion || '',
          localidad: localidad || 'Santa Fe',
        })
      }

      if (ot.logistica) {
        setLogisticaState({
          sucursalOrigen: ot.logistica.sucursalOrigen || 'Santa Fe',
          tipoEntrega: ot.logistica.tipoEntrega || 'Retira',
          direccionEntrega: ot.logistica.direccionEntrega || direccion || '',
          localidadEntrega: ot.logistica.localidadEntrega || localidad || 'Santa Fe',
          plantaBaja: Boolean(ot.logistica.pisoAcceso?.plantaBaja),
          ascensor: Boolean(ot.logistica.pisoAcceso?.ascensor),
          escaleraEstrecha: Boolean(ot.logistica.pisoAcceso?.escaleraEstrecha),
          plazoEntrega: ot.logistica.plazoEntrega || '',
          turnoEntrega: ot.logistica.turnoEntrega || 'Indistinto',
        })
      }

      if (ot.condicionesComerciales) {
        setComercialState({
          formaPago: ot.condicionesComerciales.formaPago || '',
          observacionesFactura: ot.condicionesComerciales.observacionesFactura || '',
          observacionesReparto: ot.condicionesComerciales.observacionesReparto || '',
        })
      }
    }
  }, [isEditing, orderData, componentMap, reset])


  const {
    fields: adicFields,
    append: appendAdic,
    remove: removeAdic,
    update: updateAdic,
  } = useFieldArray({ control, name: 'adicionales' })

  const {
    fields: repFields,
    append: appendRep,
    remove: removeRep,
    update: updateRep,
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

  function addSilla(id: string) {
    const existingIndex = sillasRows.findIndex((s) => s.chairTypeId === id)
    if (existingIndex !== -1) {
      setSillasRows(prev => prev.filter((_, i) => i !== existingIndex))
      setSillasError('')
    } else {
      setSillasRows((prev) => [...prev, { id: generateId(), chairTypeId: id, quantity: '1' }])
      setSillasError('')
    }
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

  const handleSelectCustomer = (c: Customer) => {
    setCustomerState({
      customerId: c._id,
      name: c.name,
      razonSocial: c.razonSocial || c.name,
      cuit: c.cuit || '',
      condicionIva: c.condicionIva || 'Consumidor Final',
      email: c.email || '',
      telefono: c.telefono || '',
      contacto: c.contacto || '',
      direccion: c.direccion || '',
      localidad: c.localidad || 'Santa Fe',
    })
    setCustomerCommandOpen(false)
  }

  const handleClearCustomer = () => {
    setCustomerState({
      customerId: '',
      name: '',
      razonSocial: '',
      cuit: '',
      condicionIva: 'Consumidor Final',
      email: '',
      telefono: '',
      contacto: '',
      direccion: '',
      localidad: 'Santa Fe',
    })
  }

  const buildPayload = (form: FormData) => ({
    sillas:
      form.tipoOrden === 'silla'
        ? sillasRows.map((s) => ({ chairTypeId: s.chairTypeId, quantity: Number(s.quantity) }))
        : undefined,
    items: [
      ...form.adicionales.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'adicional' as const })),
      ...form.repuestos.map((i) => ({ componentId: i.componentId, quantity: i.quantity, type: 'repuesto' as const })),
    ],
    customerId: customerState.customerId || undefined,
    cliente: customerState.name ? {
      customerId: customerState.customerId || undefined,
      name: customerState.name,
      razonSocial: customerState.razonSocial,
      cuit: customerState.cuit,
      condicionIva: customerState.condicionIva,
      email: customerState.email,
      telefono: customerState.telefono,
      contacto: customerState.contacto,
      domicilio: customerState.direccion,
    } : undefined,
    logistica: {
      sucursalOrigen: logisticaState.sucursalOrigen,
      tipoEntrega: logisticaState.tipoEntrega,
      direccionEntrega: logisticaState.direccionEntrega || customerState.direccion,
      localidadEntrega: logisticaState.localidadEntrega || customerState.localidad,
      pisoAcceso: {
        plantaBaja: logisticaState.plantaBaja,
        ascensor: logisticaState.ascensor,
        escaleraEstrecha: logisticaState.escaleraEstrecha,
      },
      plazoEntrega: logisticaState.plazoEntrega,
      turnoEntrega: logisticaState.turnoEntrega,
    },
    condicionesComerciales: {
      formaPago: comercialState.formaPago,
      observacionesFactura: comercialState.observacionesFactura,
      observacionesReparto: comercialState.observacionesReparto,
    },
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
    1: 'Cliente, Logística y Artículos',
    2: 'Confirmación y Disponibilidad',
    3: 'Asignar Operario',
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
      <Card className="max-w-4xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold">{isEditing ? 'Editar orden de trabajo' : 'Nueva orden de trabajo'}</CardTitle>
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
                {/* 1. SECCIÓN: DATOS DEL CLIENTE Y FACTURACIÓN */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/80 p-4 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Datos del Cliente y Facturación</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 shadow-sm"
                        onClick={() => setCustomerCommandOpen(true)}
                      >
                        <Search className="h-3 w-3" />
                        {customerState.customerId ? 'Cambiar Cliente' : 'Buscar Cliente <F1>'}
                      </Button>
                      {customerState.customerId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-destructive"
                          onClick={handleClearCustomer}
                        >
                          Limpiar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Nombre / Razón Social *</Label>
                      <Input
                        placeholder="Ej. Cooperativa / Nombre Cliente"
                        value={customerState.name}
                        onChange={(e) => setCustomerState({ ...customerState, name: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">CUIT / DNI</Label>
                      <Input
                        placeholder="Ej. 30-52076510-3"
                        value={customerState.cuit}
                        onChange={(e) => setCustomerState({ ...customerState, cuit: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Condición de IVA</Label>
                      <Select
                        value={customerState.condicionIva}
                        onChange={(e) => setCustomerState({ ...customerState, condicionIva: e.target.value as any })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      >
                        <option value="Responsable Inscripto">Responsable Inscripto</option>
                        <option value="Consumidor Final">Consumidor Final</option>
                        <option value="Monotributo">Monotributo</option>
                        <option value="Exento">Exento</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Teléfono / Celular</Label>
                      <Input
                        placeholder="Ej. 3404-418770"
                        value={customerState.telefono}
                        onChange={(e) => setCustomerState({ ...customerState, telefono: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Contacto / Encargado</Label>
                      <Input
                        placeholder="Ej. Juan Pérez"
                        value={customerState.contacto}
                        onChange={(e) => setCustomerState({ ...customerState, contacto: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Email de Facturación</Label>
                      <Input
                        placeholder="cliente@ejemplo.com"
                        type="email"
                        value={customerState.email}
                        onChange={(e) => setCustomerState({ ...customerState, email: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SECCIÓN: LOGÍSTICA, SUCURSALES Y CONDICIONES DE ENTREGA */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/80 p-4 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <Truck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Logística y Entrega</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Store className="h-3 w-3 text-primary" /> Sucursal Origen
                      </Label>
                      <Select
                        value={logisticaState.sucursalOrigen}
                        onChange={(e) => setLogisticaState({ ...logisticaState, sucursalOrigen: e.target.value as any })}
                        className="h-8 text-xs mt-1 font-semibold bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      >
                        <option value="Santa Fe">📍 Santa Fe</option>
                        <option value="Paraná">📍 Paraná</option>
                        <option value="Pedido a Fábrica">🏭 Pedido a Fábrica</option>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Modalidad de Entrega</Label>
                      <Select
                        value={logisticaState.tipoEntrega}
                        onChange={(e) => setLogisticaState({ ...logisticaState, tipoEntrega: e.target.value as any })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      >
                        <option value="Retira">Retira en Sucursal</option>
                        <option value="Reparto / Flete">Reparto / Flete a Domicilio</option>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" /> Plazo de Entrega
                      </Label>
                      <Input
                        type="date"
                        value={logisticaState.plazoEntrega}
                        onChange={(e) => setLogisticaState({ ...logisticaState, plazoEntrega: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" /> Turno de Entrega
                      </Label>
                      <Select
                        value={logisticaState.turnoEntrega}
                        onChange={(e) => setLogisticaState({ ...logisticaState, turnoEntrega: e.target.value as any })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      >
                        <option value="Indistinto">Indistinto</option>
                        <option value="Mañana">Mañana (8:00 a 12:30)</option>
                        <option value="Tarde">Tarde (13:30 a 18:00)</option>
                      </Select>
                    </div>
                  </div>

                  {logisticaState.tipoEntrega === 'Reparto / Flete' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" /> Domicilio de Entrega
                        </Label>
                        <Input
                          placeholder="Calle, número, piso/depto"
                          value={logisticaState.direccionEntrega || customerState.direccion}
                          onChange={(e) => setLogisticaState({ ...logisticaState, direccionEntrega: e.target.value })}
                          className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Accesibilidad del Edificio / Lugar</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={logisticaState.plantaBaja}
                              onChange={(e) => setLogisticaState({ ...logisticaState, plantaBaja: e.target.checked })}
                              className="rounded border-slate-400 text-primary"
                            />
                            Planta Baja
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={logisticaState.ascensor}
                              onChange={(e) => setLogisticaState({ ...logisticaState, ascensor: e.target.checked })}
                              className="rounded border-slate-400 text-primary"
                            />
                            Ascensor
                          </label>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer font-medium">
                            <input
                              type="checkbox"
                              checked={logisticaState.escaleraEstrecha}
                              onChange={(e) => setLogisticaState({ ...logisticaState, escaleraEstrecha: e.target.checked })}
                              className="rounded border-slate-400 text-destructive"
                            />
                            Escalera Estrecha
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. SECCIÓN: CONDICIONES COMERCIALES Y OBSERVACIONES */}
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/80 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Condiciones Comerciales y Observaciones</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">Forma de Pago</Label>
                      <Input
                        placeholder="Ej. Efectivo / Transf 50% anticipo"
                        value={comercialState.formaPago}
                        onChange={(e) => setComercialState({ ...comercialState, formaPago: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                        maxLength={70}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <FileText className="h-3 w-3 text-muted-foreground" /> Observaciones Factura
                      </Label>
                      <Input
                        placeholder="Notas para facturación..."
                        value={comercialState.observacionesFactura}
                        onChange={(e) => setComercialState({ ...comercialState, observacionesFactura: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Truck className="h-3 w-3 text-muted-foreground" /> Observaciones Reparto / Taller
                      </Label>
                      <Input
                        placeholder="Instrucciones para taller o chofer..."
                        value={comercialState.observacionesReparto}
                        onChange={(e) => setComercialState({ ...comercialState, observacionesReparto: e.target.value })}
                        className="h-8 text-xs mt-1 bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. SECCIÓN: ARTÍCULOS Y REPUESTOS */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">

                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Artículos de la Orden</h3>
                    </div>
                    <div className="w-48">
                      <Select id="tipoOrden" value={tipoOrden} onChange={(e) => { setValue('tipoOrden', e.target.value as 'silla' | 'repuestos'); setSillasRows([]); setValue('adicionales', []) }}>
                        <option value="silla">Silla + adicionales</option>
                        <option value="repuestos">Solo repuestos</option>
                      </Select>
                    </div>
                  </div>
                </div>


            {tipoOrden === 'silla' && (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSillaCommandOpen(true)}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Buscar tipos de silla...
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
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-muted-foreground" />
                    <Label className="text-sm font-medium">Adicionales a la silla</Label>
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdicCommandOpen(true)}>
                    <Search className="h-4 w-4 mr-2" /> Buscar adicional...
                  </Button>
                </div>
                <ItemsTable fields={adicFields} onRemove={removeAdic} onUpdateQuantity={(idx, qty) => updateAdic(idx, { ...adicFields[idx], quantity: qty })} />
              </div>
            )}

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-muted-foreground" />
                  <Label className="text-sm font-medium">Repuestos</Label>
                  <span className="text-xs text-muted-foreground">{tipoOrden === 'silla' ? '(opcional)' : '(obligatorio)'}</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setRepCommandOpen(true)}>
                  <Search className="h-4 w-4 mr-2" /> Buscar repuesto...
                </Button>
              </div>
              <ItemsTable fields={repFields} onRemove={removeRep} onUpdateQuantity={(idx, qty) => updateRep(idx, { ...repFields[idx], quantity: qty })} />
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
        <CommandDialog open={sillaCommandOpen} onOpenChange={setSillaCommandOpen}>
          <CommandInput placeholder="Buscar tipo de silla..." />
          <CommandList>
            <CommandEmpty>No se encontraron sillas.</CommandEmpty>
            <CommandGroup heading="Tipos de Silla">
              {tipoSillaOptions.map((t) => (
                <CommandItem key={t.value} value={t.label} onSelect={() => addSilla(t.value)}>
                  {t.label}
                  {sillasRows.some(s => s.chairTypeId === t.value) && (
                    <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <CommandDialog open={adicCommandOpen} onOpenChange={setAdicCommandOpen}>
          <CommandInput placeholder="Buscar adicional..." />
          <CommandList>
            <CommandEmpty>No se encontraron componentes.</CommandEmpty>
            <CommandGroup heading="Componentes">
              {componentOptions.map((c) => (
                <CommandItem key={c.value} value={c.label} onSelect={() => {
                  const existingIndex = adicFields.findIndex(f => f.componentId === c.value)
                  if (existingIndex !== -1) {
                    removeAdic(existingIndex)
                  } else {
                    appendAdic({ componentId: c.value, componentName: c.label.split(' — ')[0], quantity: 1 })
                  }
                }}>
                  {c.label}
                  {adicFields.some(f => f.componentId === c.value) && (
                    <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        {/* BUSCADOR DE CLIENTES MODAL */}
        <CommandDialog open={customerCommandOpen} onOpenChange={setCustomerCommandOpen}>
          <CommandInput placeholder="Buscar cliente por nombre, CUIT, teléfono..." value={customerSearch} onValueChange={setCustomerSearch} />
          <CommandList>
            <CommandEmpty>No se encontraron clientes registrados.</CommandEmpty>
            <CommandGroup heading="Clientes">
              {(customersData?.data ?? []).map((c) => (
                <CommandItem key={c._id} value={`${c.name} ${c.cuit || ''} ${c.telefono || ''}`} onSelect={() => handleSelectCustomer(c)}>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.cuit ? `CUIT: ${c.cuit} · ` : ''}{c.condicionIva} {c.telefono ? `· Tel: ${c.telefono}` : ''}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>

        <CommandDialog open={repCommandOpen} onOpenChange={setRepCommandOpen}>
          <CommandInput placeholder="Buscar repuesto..." />
          <CommandList>
            <CommandEmpty>No se encontraron componentes.</CommandEmpty>
            <CommandGroup heading="Componentes">
              {componentOptions.map((c) => (
                <CommandItem key={c.value} value={c.label} onSelect={() => {
                  const existingIndex = repFields.findIndex(f => f.componentId === c.value)
                  if (existingIndex !== -1) {
                    removeRep(existingIndex)
                  } else {
                    appendRep({ componentId: c.value, componentName: c.label.split(' — ')[0], quantity: 1 })
                  }
                }}>
                  {c.label}
                  {repFields.some(f => f.componentId === c.value) && (
                    <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      </Card>
    </div>

  )
}

function ItemsTable({
  fields,
  onRemove,
  onUpdateQuantity,
}: {
  fields: { id: string; componentId: string; componentName: string; quantity: number }[]
  onRemove: (index: number) => void
  onUpdateQuantity?: (index: number, quantity: number) => void
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
              <TableCell>
                {onUpdateQuantity ? (
                  <Input type="number" min={1} value={item.quantity || ''} onChange={(e) => onUpdateQuantity(idx, Number(e.target.value) || 1)} className="w-24 h-8" />
                ) : (
                  item.quantity
                )}
              </TableCell>
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
