import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { WorkOrder, WorkOrderDetalle, AxiosErrorType, User as Usuario } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useState } from 'react'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Pencil,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  RotateCcw,
  ChevronDown,
  UserPlus,
  ClipboardCheck,
  Printer,
  Building2,
  FileText,
  CheckSquare,
} from 'lucide-react'
import { cn, qtyWithUnit } from '@/lib/utils'
import { GoBack } from '@/components/shared/GoBack'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { getOrdenSillas } from '@/lib/ordenes'
import FinalizarOrdenModal from './FinalizarOrdenModal'

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  pausada: 'Pausada',
  control: 'En control',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
}

const statusClass: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 border-gray-300',
  en_progreso: 'bg-blue-100 text-blue-700 border-blue-300',
  pausada: 'bg-amber-100 text-amber-700 border-amber-300',
  control: 'bg-purple-100 text-purple-700 border-purple-300',
  finalizada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-red-100 text-red-700 border-red-300',
}

const transitions: Record<string, { status: string; label: string; className: string; icon: typeof Play }[]> = {
  pendiente: [
    { status: 'en_progreso', label: 'Iniciar', className: 'bg-green-600 hover:bg-green-700 text-white', icon: Play },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
  en_progreso: [
    { status: 'control', label: 'Enviar a control', className: 'bg-purple-600 hover:bg-purple-700 text-white', icon: ClipboardCheck },
    { status: 'pausada', label: 'Pausar', className: 'bg-amber-500 hover:bg-amber-600 text-white', icon: Pause },
    { status: 'finalizada', label: 'Finalizar directo', className: 'bg-green-600 hover:bg-green-700 text-white', icon: CheckCircle },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
  pausada: [
    { status: 'en_progreso', label: 'Reanudar', className: 'bg-green-600 hover:bg-green-700 text-white', icon: RotateCcw },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
  control: [
    { status: 'finalizada', label: 'Aprobar y Finalizar (Checkout)', className: 'bg-green-600 hover:bg-green-700 text-white', icon: CheckCircle },
    { status: 'en_progreso', label: 'Devolver a armado', className: 'bg-amber-500 hover:bg-amber-600 text-white', icon: RotateCcw },
    { status: 'cancelada', label: 'Cancelar', className: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', icon: XCircle },
  ],
}

function AuditInfo({ ot }: { ot: WorkOrder }) {
  return (
    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
      {ot.createdBy && (
        <p>Creada por: <span className="font-medium text-foreground">{ot.createdBy.name} ({ot.createdBy.role})</span> · {new Date(ot.createdAt).toLocaleString()}</p>
      )}
      {ot.startedBy && ot.startedAt && (
        <p>Iniciada por: <span className="font-medium text-foreground">{ot.startedBy.name} ({ot.startedBy.role})</span> · {new Date(ot.startedAt).toLocaleString()}</p>
      )}
      {ot.finalizedBy && ot.finalizedAt && (
        <p>Finalizada por: <span className="font-medium text-foreground">{ot.finalizedBy.name} ({ot.finalizedBy.role})</span> · {new Date(ot.finalizedAt).toLocaleString()}</p>
      )}
    </div>
  )
}

const stepIcons: Record<string, typeof Clock> = {
  pendiente: Calendar,
  en_progreso: Play,
  pausada: Pause,
  control: ClipboardCheck,
  finalizada: CheckCircle,
  cancelada: XCircle,
}

const stepClass: Record<string, string> = {
  pendiente: 'text-gray-500',
  en_progreso: 'text-blue-600',
  pausada: 'text-amber-600',
  control: 'text-purple-600',
  finalizada: 'text-green-600',
  cancelada: 'text-destructive',
}

function OrderTimeline({ ot }: { ot: WorkOrder }) {
  const steps = ot.statusHistory && ot.statusHistory.length > 0
    ? ot.statusHistory.map((e) => ({
        label: statusLabels[e.status],
        icon: stepIcons[e.status] ?? Clock,
        date: e.at,
        user: e.by,
        notes: e.notes,
        active: true,
        className: stepClass[e.status] ?? 'text-muted-foreground',
      }))
    : [
        {
          label: 'Creada',
          icon: Calendar,
          date: ot.createdAt,
          user: ot.createdBy,
          active: true,
          className: 'text-muted-foreground',
        },
        {
          label: 'Iniciada',
          icon: Play,
          date: ot.startedAt,
          user: ot.startedBy,
          active: !!ot.startedAt,
          className: 'text-blue-600',
        },
        {
          label: ot.status === 'cancelada' ? 'Cancelada' : 'Finalizada',
          icon: ot.status === 'cancelada' ? XCircle : CheckCircle,
          date: ot.finalizedAt,
          user: ot.finalizedBy,
          active: ot.status === 'finalizada' || ot.status === 'cancelada',
          className: ot.status === 'cancelada' ? 'text-destructive' : 'text-green-600',
        },
      ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Clock size={16} className="text-muted-foreground" />
        Historial de estados
      </h3>
      <div className="relative">
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
        <div className="space-y-6">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex items-start gap-3">
              <div className={cn(
                'relative z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-background',
                step.active ? `border-current ${step.className}` : 'border-muted-foreground text-muted-foreground'
              )}>
                <step.icon size={12} />
              </div>
              <div className="flex-1">
                <p className={cn('text-sm font-medium', step.active ? step.className : 'text-muted-foreground')}>
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground">{new Date(step.date).toLocaleString()}</p>
                )}
                {step.user && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User size={10} />
                    {step.user.name} ({step.user.role})
                  </p>
                )}
                {'notes' in step && step.notes && (
                  <p className="text-xs mt-1 bg-amber-50 text-amber-900 border border-amber-200 rounded px-2 py-1">
                    {step.notes as string}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrdenTrabajoDetail() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null)
  const [statusNotes, setStatusNotes] = useState('')
  const [selectedOperator, setSelectedOperator] = useState('')
  const [showFinalize, setShowFinalize] = useState(false)
  const [showComponentes, setShowComponentes] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assignOnlyOperator, setAssignOnlyOperator] = useState('')
  const [stockError, setStockError] = useState<{ componentId: string; name: string; necesario: number; disponible: number }[] | null>(null)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [showRemitoModal, setShowRemitoModal] = useState(false)
  const [showTallerModal, setShowTallerModal] = useState(false)



  const { data, isLoading } = useQuery<{ data: WorkOrder }>({
    queryKey: ['orden-trabajo', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}`).then((r) => r.data),
  })

  const { data: detalleData } = useQuery<{ data: WorkOrderDetalle }>({
    queryKey: ['orden-trabajo-detalle', id],
    queryFn: () => api.get(`/ordenes-trabajo/${id}/detalle`).then((r) => r.data),
    enabled: !!data?.data,
  })

  const mutation = useMutation({
    mutationFn: ({ status, notas }: { status: string; notas?: string }) =>
      api.patch(`/ordenes-trabajo/${id}/estado`, { status, notas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
      queryClient.invalidateQueries({ queryKey: ['stats-ranking'] })
      setConfirmStatus(null)
      setStatusNotes('')
      setStockError(null)
      setGeneralError(null)
    },
    onError: (err: AxiosErrorType) => {
      setConfirmStatus(null)
      const details = err?.response?.data?.error?.details as { faltantes?: { componentId: string; name: string; necesario: number; disponible: number }[] } | undefined
      if (details?.faltantes && details.faltantes.length > 0) {
        setStockError(details.faltantes)
      } else {
        setGeneralError(err?.response?.data?.error?.message || 'Error al actualizar el estado de la orden')
      }
    },
  })

  const { data: usuariosData } = useQuery<{ data: Usuario[] }>({
    queryKey: ['usuarios', 'asignar'],
    queryFn: () => api.get('/auth/usuarios', { params: { limit: 1000 } }).then((r) => r.data),
    enabled: isAdmin,
  })

  const assignMutation = useMutation({
    mutationFn: ({ assignedTo }: { assignedTo: string | null }) =>
      api.patch(`/ordenes-trabajo/${id}/asignar`, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', id] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
    },
  })

  if (isLoading) return <Skeleton className="h-96" />
  if (!data?.data) return <p className="text-muted-foreground">Orden no encontrada</p>

  const ot = data.data
  let actions = transitions[ot.status] ?? []
  if (!isAdmin) {
    if (ot.status === 'pendiente') {
      actions = [{ status: 'en_progreso', label: 'Iniciar orden', className: 'bg-green-600 hover:bg-green-700 text-white', icon: Play }]
    } else if (ot.status === 'en_progreso') {
      actions = [{ status: 'control', label: 'Finalizar y enviar a control', className: 'bg-purple-600 hover:bg-purple-700 text-white', icon: ClipboardCheck }]
    } else {
      actions = []
    }
  }
  const canEdit = isAdmin && ot.status === 'pendiente'
  const tieneSillas = getOrdenSillas(ot).length > 0

  const empleados = (usuariosData?.data ?? []).filter((u) => u.role === 'operario')

  function handleConfirm() {
    if (!confirmStatus) return
    const startFlow = () => mutation.mutate({ status: confirmStatus, notas: statusNotes || undefined })
    if (confirmStatus === 'en_progreso' && !ot.assignedTo && selectedOperator) {
      assignMutation.mutate({ assignedTo: selectedOperator }, { onSuccess: startFlow })
    } else {
      startFlow()
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <GoBack to="/ordenes-trabajo" />

      {generalError && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{generalError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setGeneralError(null)}>✕</Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              OT #{ot._id.slice(-6)}
              <Badge variant="outline" className={statusClass[ot.status]}>{statusLabels[ot.status]}</Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRemitoModal(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer size={14} /> Imprimir Remito
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTallerModal(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <FileText size={14} /> Orden de Taller
            </Button>
            {canEdit && (
              <Link to={`/ordenes-trabajo/${ot._id}/editar`}>
                <Button variant="outline" size="sm"><Pencil size={14} className="mr-1" /> Editar</Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">

            <div className="col-span-2">
              <p className="text-sm text-muted-foreground">Tipo(s) de silla</p>
              {getOrdenSillas(ot).length === 0 ? (
                <p className="font-medium">Solo repuestos</p>
              ) : (
                getOrdenSillas(ot).map((s, idx) => (
                  <p key={s.chairTypeId?._id || idx} className="font-medium">
                    {s.chairTypeId?.name || 'Silla Eliminada'} ×{s.quantity}
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creada</p>
              <p className="font-medium">{new Date(ot.createdAt).toLocaleString()}</p>
            </div>
            {ot.finalizedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Finalizada</p>
                <p className="font-medium">{new Date(ot.finalizedAt).toLocaleString()}</p>
              </div>
            )}
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm text-muted-foreground">Operario asignado</p>
              <p className="font-medium">{ot.assignedTo ? ot.assignedTo.name : 'Sin asignar'}</p>
            </div>
          </div>

          <OrderTimeline ot={ot} />

          {isAdmin && <AuditInfo ot={ot} />}

          {isAdmin && ot.status === 'control' && (
            <div className="flex items-center gap-3 p-3.5 bg-purple-50 border border-purple-200 text-purple-950 rounded-lg text-sm">
              <ClipboardCheck size={20} className="text-purple-600 shrink-0" />
              <div>
                <p className="font-semibold">Revisión de Control / Checkout</p>
                <p className="text-purple-800 text-xs">El operario completó el armado. Hacé clic en <strong>"Aprobar y Finalizar (Checkout)"</strong> para verificar las cantidades y descontar los materiales del stock, o devolvela a armado si requiere correcciones.</p>
              </div>
            </div>
          )}

          {!isAdmin && ot.status === 'control' && (
            <div className="flex items-center gap-3 p-3.5 bg-purple-50 border border-purple-200 text-purple-950 rounded-lg text-sm">
              <ClipboardCheck size={20} className="text-purple-600 shrink-0" />
              <div>
                <p className="font-semibold">Orden en control de calidad</p>
                <p className="text-purple-800 text-xs">El encargado o administrador realizará la verificación física y checkout final de los componentes.</p>
              </div>
            </div>
          )}

          {ot.operatorNotes && (
            <div className="text-sm bg-amber-50 text-amber-900 p-3 rounded-md border border-amber-200">
              <p className="font-medium">Notas del operario:</p>
              <p>{ot.operatorNotes}</p>
            </div>
          )}

          {(actions.length > 0 || (isAdmin && canEdit)) && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {isAdmin && canEdit && (
                <Button variant="outline" onClick={() => { setAssignOnlyOperator(ot.assignedTo?._id ?? ''); setShowAssignDialog(true); }}>
                  <UserPlus size={16} className="mr-2" /> Delegar
                </Button>
              )}
              {actions.map((action) => (
                <Button
                  key={action.status}
                  className={cn(action.className, 'gap-2')}
                  onClick={() => {
                    if (action.status === 'finalizada') {
                      setShowFinalize(true)
                    } else {
                      setSelectedOperator(ot.assignedTo?._id ?? '')
                      setConfirmStatus(action.status)
                    }
                  }}
                >
                  <action.icon size={16} /> {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* INFORMACIÓN DE CLIENTE Y LOGÍSTICA */}
      {(ot.cliente || ot.logistica) && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" /> Información de Cliente, Sucursal y Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ot.cliente && (
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3.5 bg-slate-100/90 dark:bg-slate-900/80 space-y-1 shadow-sm">
                  <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Cliente / Facturación</p>
                  <p className="font-bold text-sm text-foreground">{ot.cliente.name || ot.cliente.razonSocial}</p>
                  {ot.cliente.cuit && <p className="text-muted-foreground">CUIT: <strong className="text-foreground">{ot.cliente.cuit}</strong></p>}
                  {ot.cliente.condicionIva && <p className="text-muted-foreground">IVA: <strong className="text-foreground">{ot.cliente.condicionIva}</strong></p>}
                  {ot.cliente.telefono && <p className="text-muted-foreground">Teléfono: <strong className="text-foreground">{ot.cliente.telefono}</strong></p>}
                  {ot.cliente.email && <p className="text-muted-foreground">Email: <strong className="text-foreground">{ot.cliente.email}</strong></p>}
                  {ot.cliente.contacto && <p className="text-muted-foreground">Contacto: <strong className="text-foreground">{ot.cliente.contacto}</strong></p>}
                  {ot.cliente.domicilio && <p className="text-muted-foreground">Domicilio: <strong className="text-foreground">{ot.cliente.domicilio}</strong></p>}
                </div>
              )}
              {ot.logistica && (
                <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3.5 bg-slate-100/90 dark:bg-slate-900/80 space-y-1 shadow-sm">
                  <p className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Logística y Despacho</p>
                  <p className="text-muted-foreground">Sucursal Origen: <strong className="text-foreground">{ot.logistica.sucursalOrigen || 'Santa Fe'}</strong></p>
                  <p className="text-muted-foreground">Modalidad: <strong className="text-foreground">{ot.logistica.tipoEntrega || 'Retira'}</strong></p>
                  {ot.logistica.direccionEntrega && <p className="text-muted-foreground">Dirección de Entrega: <strong className="text-foreground">{ot.logistica.direccionEntrega}</strong></p>}
                  {ot.logistica.plazoEntrega && <p className="text-muted-foreground">Plazo de Entrega: <strong className="text-foreground">{ot.logistica.plazoEntrega}</strong></p>}
                  {ot.logistica.turnoEntrega && <p className="text-muted-foreground">Turno: <strong className="text-foreground">{ot.logistica.turnoEntrega}</strong></p>}
                  {ot.logistica.pisoAcceso && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {ot.logistica.pisoAcceso.plantaBaja && <Badge variant="secondary" className="text-[10px]">Planta Baja</Badge>}
                      {ot.logistica.pisoAcceso.ascensor && <Badge variant="secondary" className="text-[10px]">Ascensor</Badge>}
                      {ot.logistica.pisoAcceso.escaleraEstrecha && <Badge variant="destructive" className="text-[10px]">Escalera Estrecha</Badge>}
                    </div>
                  )}
                </div>
              )}
            </div>
            {ot.condicionesComerciales && (
              <div className="rounded-xl border border-slate-300 dark:border-slate-700 p-3 bg-slate-100/90 dark:bg-slate-900/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs shadow-sm">
                {ot.condicionesComerciales.formaPago && <div><span className="text-muted-foreground">Forma de Pago:</span> <strong>{ot.condicionesComerciales.formaPago}</strong></div>}
                {ot.condicionesComerciales.observacionesFactura && <div><span className="text-muted-foreground">Obs. Factura:</span> {ot.condicionesComerciales.observacionesFactura}</div>}
                {ot.condicionesComerciales.observacionesReparto && <div><span className="text-muted-foreground">Obs. Reparto:</span> {ot.condicionesComerciales.observacionesReparto}</div>}
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {ot.status === 'control' && (
        <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-300 text-purple-950 rounded-lg shadow-sm">
          <ClipboardCheck size={24} className="text-purple-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-purple-900">Aviso de Control de Calidad: Egreso Pendiente</p>
              <Badge variant="outline" className="border-purple-400 bg-purple-100 text-purple-800 text-xs">
                Listos para descontar ({detalleData?.data.items.length || 0} ítems)
              </Badge>
            </div>
            <p className="text-purple-800 text-xs">
              Los componentes listados abajo están <strong>reservados</strong> y se <strong>descontarán definitivamente del inventario</strong> una vez que el encargado apruebe el Checkout.
            </p>
          </div>
        </div>
      )}

      {ot.status === 'finalizada' && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 text-green-950 rounded-lg shadow-sm">
          <CheckCircle size={24} className="text-green-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-green-900">Detalle de Componentes Descontados (Consumo Confirmado)</p>
              <Badge variant="outline" className="border-green-400 bg-green-100 text-green-800 text-xs">
                ✓ Stock descontado
              </Badge>
            </div>
            <p className="text-green-800 text-xs">
              Se egresaron {detalleData?.data.items.reduce((acc, i) => acc + i.quantity, 0)} unidades de componentes del stock el {new Date(ot.finalizedAt || ot.updatedAt).toLocaleString()}{ot.finalizedBy ? ` por ${ot.finalizedBy.name}` : ''}.
            </p>
          </div>
        </div>
      )}

      {detalleData?.data.items && detalleData.data.items.length > 0 && (
        <Card>
          {tieneSillas && ot.status !== 'control' && ot.status !== 'finalizada' ? (
            <CardHeader
              className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
              onClick={() => setShowComponentes((v) => !v)}
            >
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Items</span>
                  <Badge variant="outline" className="text-xs">
                    {detalleData.data.items.length} componentes
                  </Badge>
                </CardTitle>
                <ChevronDown size={18} className={cn('text-muted-foreground transition-transform', !showComponentes && '-rotate-90')} />
              </div>
            </CardHeader>
          ) : (
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>
                  {ot.status === 'finalizada'
                    ? 'Componentes descontados de stock'
                    : ot.status === 'control'
                    ? 'Componentes listos para descontar en checkout'
                    : 'Componentes requeridos'}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    ot.status === 'finalizada' && 'border-green-400 bg-green-50 text-green-700',
                    ot.status === 'control' && 'border-purple-400 bg-purple-50 text-purple-700',
                    ot.status === 'en_progreso' && 'border-blue-400 bg-blue-50 text-blue-700',
                    ot.status === 'pendiente' && 'border-gray-300 bg-gray-50 text-gray-700'
                  )}
                >
                  {ot.status === 'finalizada'
                    ? 'Descontados'
                    : ot.status === 'control'
                    ? 'Egreso pendiente'
                    : ot.status === 'en_progreso'
                    ? 'Reservados'
                    : 'Sin reservar'}
                </Badge>
              </CardTitle>
            </CardHeader>
          )}
          {(!tieneSillas || showComponentes || ot.status === 'control' || ot.status === 'finalizada') && (
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Componente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Sub-tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Estado en stock</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detalleData.data.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.componentId.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.componentId.tipo || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{item.componentId.subtipo || '—'}</TableCell>
                        <TableCell className="font-semibold">
                          {qtyWithUnit(item.quantity, item.unit || item.componentId.unit)}
                        </TableCell>
                        <TableCell>
                          {ot.status === 'finalizada' && (
                            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 text-xs">
                              ✓ Descontado
                            </Badge>
                          )}
                          {ot.status === 'control' && (
                            <Badge variant="outline" className="border-purple-300 bg-purple-50 text-purple-700 text-xs">
                              ⏳ Por descontar
                            </Badge>
                          )}
                          {ot.status === 'en_progreso' && (
                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 text-xs">
                              Reservado
                            </Badge>
                          )}
                          {ot.status === 'pendiente' && (
                            <Badge variant="outline" className="border-gray-300 bg-gray-50 text-gray-600 text-xs">
                              Pendiente
                            </Badge>
                          )}
                          {ot.status === 'pausada' && (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 text-xs">
                              Reservado (pausado)
                            </Badge>
                          )}
                          {ot.status === 'cancelada' && (
                            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 text-xs">
                              Cancelado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.tipo === 'bom' && <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">Silla</Badge>}
                          {item.tipo === 'adicional' && <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">Adicional</Badge>}
                          {item.tipo === 'repuesto' && <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 bg-orange-50">Repuesto</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      <Dialog open={!!confirmStatus} onOpenChange={() => { setConfirmStatus(null); setStatusNotes('') }}>
        <DialogHeader>
          <DialogTitle>
            {confirmStatus === 'finalizada' ? '¿Finalizar orden?' :
             confirmStatus === 'cancelada' ? '¿Cancelar orden?' :
             confirmStatus === 'en_progreso' ? '¿Iniciar orden?' :
             confirmStatus === 'control' ? '¿Enviar a control de calidad?' :
             '¿Pausar orden?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmStatus === 'finalizada' ? 'Se descontará el stock de los componentes.' :
           confirmStatus === 'cancelada' ? 'Se liberará la reserva de stock (si corresponde).' :
           confirmStatus === 'en_progreso' ? (ot.status === 'control' ? 'La orden volverá al operario para revisión o ajustes.' : 'Se reservará el stock necesario.') :
           confirmStatus === 'control' ? 'La orden pasará a revisión del encargado para el control de calidad y checkout final.' :
           'La orden se pausará, la reserva de stock se mantiene.'}
        </p>
        {confirmStatus === 'en_progreso' && !ot.assignedTo && (
          <div className="space-y-2 mb-4">
            <Label htmlFor="assignOperator">Asignar operario</Label>
            <Select
              id="assignOperator"
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
            >
              <option value="">Seleccioná un operario...</option>
              {empleados.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
              ))}
            </Select>
          </div>
        )}
        <div className="space-y-3 mb-4">
          <Label htmlFor="statusNotes">Notas (opcional)</Label>
          <Input
            id="statusNotes"
            placeholder={
              confirmStatus === 'control'
                ? 'ej. Armado completo, tapizado revisado sin detalles...'
                : confirmStatus === 'en_progreso' && ot.status === 'control'
                ? 'ej. Corregir ajuste de tornillos en apoyabrazos...'
                : 'ej. Iniciada con material disponible, pausada por falta de...'
            }
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmStatus(null)}>Volver</Button>
          <Button
            className={cn(
              confirmStatus === 'cancelada' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              confirmStatus === 'en_progreso' && 'bg-green-600 hover:bg-green-700 text-white',
              confirmStatus === 'pausada' && 'bg-amber-500 hover:bg-amber-600 text-white',
              confirmStatus === 'control' && 'bg-purple-600 hover:bg-purple-700 text-white',
              confirmStatus === 'finalizada' && 'bg-green-600 hover:bg-green-700 text-white'
            )}
            onClick={handleConfirm}
            disabled={mutation.isPending || assignMutation.isPending || (confirmStatus === 'en_progreso' && !ot.assignedTo && !selectedOperator)}
          >
            {mutation.isPending || assignMutation.isPending ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </Dialog>

      <Dialog open={!!stockError} onOpenChange={() => setStockError(null)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={18} /> No hay stock suficiente
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          No se puede iniciar la orden porque faltan los siguientes componentes:
        </p>
        <div className="rounded-md border overflow-x-auto mb-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Componente</TableHead>
                <TableHead>Necesario</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Faltante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockError?.map((item) => (
                <TableRow key={item.componentId}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.necesario}</TableCell>
                  <TableCell className="text-destructive font-bold">{item.disponible}</TableCell>
                  <TableCell>{Math.max(0, item.necesario - item.disponible)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStockError(null)}>Volver</Button>
          <Link to="/ingreso-stock">
            <Button onClick={() => setStockError(null)}>Ir a cargar stock</Button>
          </Link>
        </div>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogHeader>
          <DialogTitle>Delegar Orden</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Asignar un operario a esta orden sin iniciarla.
        </p>
        <div className="space-y-2 mb-4">
          <Label htmlFor="assignOnlyOperator">Operario</Label>
          <Select
            id="assignOnlyOperator"
            value={assignOnlyOperator}
            onChange={(e) => setAssignOnlyOperator(e.target.value)}
          >
            <option value="">Seleccioná un operario...</option>
            {empleados.map((u) => (
              <option key={u.id} value={u.id}>{u.name || u.username} ({u.role})</option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
          <Button
            onClick={() => assignMutation.mutate({ assignedTo: assignOnlyOperator || null }, { onSuccess: () => setShowAssignDialog(false) })}
            disabled={assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </Dialog>

      {detalleData?.data.items && (
        <FinalizarOrdenModal
          orderId={ot._id}
          items={detalleData.data.items}
          isOpen={showFinalize}
          onClose={() => setShowFinalize(false)}
        />
      )}

      {/* MODAL IMPRIMIBLE: REMITO DE ENTREGA */}
      <Dialog open={showRemitoModal} onOpenChange={setShowRemitoModal}>
        <div className="p-4 max-w-3xl mx-auto space-y-4 print:p-0 print:m-0">
          <div className="flex justify-between items-center print:hidden border-b pb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" /> Vista Previa de Remito de Entrega
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRemitoModal(false)}>Cerrar</Button>
              <Button size="sm" className="bg-primary text-white gap-1.5" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir Remito
              </Button>
            </div>
          </div>

          <div className="bg-white text-black p-6 rounded-md border shadow-sm print:border-none print:shadow-none print:p-0 space-y-4 font-sans text-xs">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-3">
              <div>
                <h1 className="text-xl font-black tracking-wider uppercase">OFFICE CENTER</h1>
                <p className="text-[11px] text-gray-600 font-medium">Equipamiento Corporativo & Mobiliario de Oficina</p>
                <p className="text-[10px] text-gray-500">Santa Fe · Paraná · Rosario</p>
              </div>
              <div className="text-right">
                <div className="inline-block border-2 border-black px-3 py-1 text-center">
                  <span className="text-[10px] uppercase font-bold block">DOCUMENTO NO VÁLIDO COMO FACTURA</span>
                  <span className="text-base font-black">REMITO DE ENTREGA</span>
                </div>
                <p className="text-xs font-bold mt-1">N°: R-0001-{ot._id.slice(-6).toUpperCase()}</p>
                <p className="text-[10px] text-gray-600">Fecha: {new Date().toLocaleDateString('es-AR')}</p>
              </div>
            </div>

            {/* Datos del Cliente y Logística */}
            <div className="grid grid-cols-2 gap-3 border border-gray-300 p-3 rounded">
              <div>
                <p className="font-bold text-[11px] uppercase border-b border-gray-200 pb-0.5 mb-1 text-gray-800">Datos del Destinatario</p>
                <p><span className="font-semibold text-gray-600">Razón Social:</span> <strong>{ot.cliente?.name || ot.cliente?.razonSocial || 'Consumidor Final'}</strong></p>
                {ot.cliente?.cuit && <p><span className="font-semibold text-gray-600">CUIT / DNI:</span> {ot.cliente.cuit}</p>}
                {ot.cliente?.condicionIva && <p><span className="font-semibold text-gray-600">Condición IVA:</span> {ot.cliente.condicionIva}</p>}
                {ot.cliente?.telefono && <p><span className="font-semibold text-gray-600">Teléfono:</span> {ot.cliente.telefono}</p>}
                {ot.cliente?.contacto && <p><span className="font-semibold text-gray-600">Atención:</span> {ot.cliente.contacto}</p>}
              </div>
              <div>
                <p className="font-bold text-[11px] uppercase border-b border-gray-200 pb-0.5 mb-1 text-gray-800">Condiciones de Entrega</p>
                <p><span className="font-semibold text-gray-600">Sucursal Origen:</span> <strong>{ot.logistica?.sucursalOrigen || 'Santa Fe'}</strong></p>
                <p><span className="font-semibold text-gray-600">Modalidad:</span> <strong>{ot.logistica?.tipoEntrega || 'Retira'}</strong></p>
                <p><span className="font-semibold text-gray-600">Domicilio:</span> {ot.logistica?.direccionEntrega || ot.cliente?.domicilio || 'Retiro en local'}</p>
                <p><span className="font-semibold text-gray-600">Plazo / Turno:</span> {ot.logistica?.plazoEntrega || 'Inmediato'} ({ot.logistica?.turnoEntrega || 'Indistinto'})</p>
                {ot.logistica?.pisoAcceso && (
                  <p className="text-[10px] text-gray-600">
                    Acceso: {[
                      ot.logistica.pisoAcceso.plantaBaja ? 'Planta Baja' : '',
                      ot.logistica.pisoAcceso.ascensor ? 'Ascensor' : '',
                      ot.logistica.pisoAcceso.escaleraEstrecha ? 'Escalera Estrecha' : '',
                    ].filter(Boolean).join(', ') || 'Normal'}
                  </p>
                )}
              </div>
            </div>

            {/* Tabla de Artículos */}
            <div>
              <p className="font-bold text-[11px] uppercase text-gray-800 mb-1">Detalle de Mercadería Entregada</p>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left">
                    <th className="p-2 border-r border-black w-16 text-center">Cant.</th>
                    <th className="p-2 border-r border-black">Descripción del Artículo</th>
                    <th className="p-2">Detalle / Modelo</th>
                  </tr>
                </thead>
                <tbody>
                  {getOrdenSillas(ot).map((s, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="p-2 border-r border-black text-center font-bold text-sm">{s.quantity}</td>
                      <td className="p-2 border-r border-black font-semibold">{s.chairTypeId?.name || 'Silla de Oficina'}</td>
                      <td className="p-2 text-gray-600">Silla terminada lista para uso · Control de calidad OK</td>
                    </tr>
                  ))}
                  {(ot.items ?? []).filter(i => i.type === 'repuesto').map((r, idx) => (
                    <tr key={`r-${idx}`} className="border-b border-gray-300">
                      <td className="p-2 border-r border-black text-center font-bold text-sm">{r.quantity}</td>
                      <td className="p-2 border-r border-black font-semibold">Repuesto / Componente</td>
                      <td className="p-2 text-gray-600">Repuesto unitario suelto</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ot.condicionesComerciales?.observacionesReparto && (
              <div className="border border-gray-300 p-2 rounded text-[11px] bg-gray-50">
                <span className="font-bold">Observaciones para el reparto:</span> {ot.condicionesComerciales.observacionesReparto}
              </div>
            )}

            {/* Conformidad y Firma */}
            <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-black">
              <div className="text-[10px] text-gray-500 space-y-1">
                <p>Recibí conforme la cantidad de bultos y mercadería especificada en el presente remito, en perfectas condiciones de uso y embalaje.</p>
                <p className="font-semibold text-gray-700">Office Center - Garantía Oficial</p>
              </div>
              <div className="border border-gray-400 p-3 rounded space-y-3">
                <div className="border-b border-gray-400 border-dashed pb-4">
                  <span className="text-[10px] text-gray-400 block">Firma del Receptor:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>Aclaración: _____________________</div>
                  <div>DNI: _________________________</div>
                  <div>Fecha: ______/______/2026</div>
                  <div>Hora: ______:______ hs</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog>

      {/* MODAL IMPRIMIBLE: ORDEN DE TALLER Y PRODUCCIÓN */}
      <Dialog open={showTallerModal} onOpenChange={setShowTallerModal}>
        <div className="p-4 max-w-3xl mx-auto space-y-4 print:p-0 print:m-0">
          <div className="flex justify-between items-center print:hidden border-b pb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Hoja de Ruta y Producción de Taller
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowTallerModal(false)}>Cerrar</Button>
              <Button size="sm" className="bg-primary text-white gap-1.5" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir Hoja de Taller
              </Button>
            </div>
          </div>

          <div className="bg-white text-black p-6 rounded-md border shadow-sm print:border-none print:shadow-none print:p-0 space-y-4 font-sans text-xs">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-3">
              <div>
                <h1 className="text-xl font-black tracking-wider uppercase">OFFICE CENTER · FÁBRICA</h1>
                <p className="text-[11px] text-gray-600 font-bold">ORDEN DE TRABAJO Y HOJA DE TALLER</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black bg-black text-white px-3 py-1 rounded">
                  OT #{ot._id.slice(-6).toUpperCase()}
                </span>
                <p className="text-[10px] text-gray-600 mt-1">Fecha: {new Date(ot.createdAt).toLocaleString('es-AR')}</p>
              </div>
            </div>

            {/* Info Rápida de Taller */}
            <div className="grid grid-cols-3 gap-2 border border-black p-2.5 rounded bg-gray-50 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Operario Asignado</span>
                <strong className="text-sm font-black">{ot.assignedTo?.name || 'Sin Asignar'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Sucursal Destino</span>
                <strong className="text-sm">{ot.logistica?.sucursalOrigen || 'Santa Fe'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Plazo / Turno</span>
                <strong className="text-sm">{ot.logistica?.plazoEntrega || 'Inmediato'} ({ot.logistica?.turnoEntrega || 'Indistinto'})</strong>
              </div>
            </div>

            {/* Modelos a Armar */}
            <div>
              <p className="font-bold text-[11px] uppercase text-gray-800 mb-1 flex items-center gap-1">
                <CheckSquare size={13} /> Sillas a Fabricar
              </p>
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-black text-left">
                    <th className="p-2 border-r border-black w-16 text-center">Cant.</th>
                    <th className="p-2 border-r border-black">Modelo de Silla</th>
                    <th className="p-2 w-28 text-center">Armado OK</th>
                  </tr>
                </thead>
                <tbody>
                  {getOrdenSillas(ot).map((s, idx) => (
                    <tr key={idx} className="border-b border-gray-300">
                      <td className="p-2 border-r border-black text-center font-black text-base">{s.quantity}</td>
                      <td className="p-2 border-r border-black font-bold">{s.chairTypeId?.name || 'Silla de Oficina'}</td>
                      <td className="p-2 text-center text-gray-400 font-mono text-xs">[ &nbsp; &nbsp; &nbsp; ]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Materiales y Componentes Requeridos (BOM Consolidado) */}
            {detalleData?.data?.items && detalleData.data.items.length > 0 && (
              <div>
                <p className="font-bold text-[11px] uppercase text-gray-800 mb-1">
                  Desglose de Componentes y Piezas (BOM)
                </p>
                <table className="w-full border-collapse border border-gray-400 text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-400 text-left">
                      <th className="p-1.5 border-r border-gray-400">Componente</th>
                      <th className="p-1.5 border-r border-gray-400 w-24">Tipo</th>
                      <th className="p-1.5 border-r border-gray-400 w-16 text-right">Cant.</th>
                      <th className="p-1.5 w-16 text-center">Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleData.data.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-1.5 border-r border-gray-300 font-medium">{item.componentId?.name || 'Componente'}</td>
                        <td className="p-1.5 border-r border-gray-300 text-gray-600">{item.componentId?.tipo || 'Pieza'}</td>
                        <td className="p-1.5 border-r border-gray-300 text-right font-bold">{qtyWithUnit(item.quantity, item.unit)}</td>
                        <td className="p-1.5 text-center text-gray-400 font-mono text-xs">[ &nbsp; ]</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}


            {/* Firmas de Taller */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black">
              <div className="border-t border-gray-400 pt-2 text-center text-[10px]">
                <p className="font-bold">Firma Operario Armador</p>
              </div>
              <div className="border-t border-gray-400 pt-2 text-center text-[10px]">
                <p className="font-bold">Firma Encargado Control de Calidad</p>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

