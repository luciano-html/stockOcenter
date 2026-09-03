import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import type { WorkOrder } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getOrdenSillasLabel } from '@/lib/ordenes'
import { useCreateDeliveryRoute } from '@/services/deliveryRoutes'
import { AlertTriangle } from 'lucide-react'

export function ColaReparto() {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [driver, setDriver] = useState('')
  const [assistant, setAssistant] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  const { data: workOrders, isLoading, error } = useQuery<{ data: WorkOrder[] }>({
    queryKey: ['ordenes-trabajo', { estado: 'espera_reparto' }],
    queryFn: async () => {
      const res = await api.get('/ordenes-trabajo', { params: { estado: 'espera_reparto', limit: 100 } })
      return res.data
    },
  })

  const { mutate: createRoute, isPending: isCreating } = useCreateDeliveryRoute()

  const orderList = workOrders?.data || []

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCreateRoute = () => {
    setFormError(null)
    setFormSuccess(null)
    if (!driver.trim()) return setFormError('Debe ingresar el nombre del chofer.')
    if (selectedIds.length === 0) return setFormError('Debe seleccionar al menos una orden.')
    
    createRoute({
      driver,
      assistant,
      orders: selectedIds
    }, {
      onSuccess: () => {
        setDriver('')
        setAssistant('')
        setSelectedIds([])
        setFormSuccess('Hoja de Ruta creada exitosamente.')
        setTimeout(() => setFormSuccess(null), 3000)
      },
      onError: (err: any) => {
        setFormError(err?.response?.data?.error?.message || err?.response?.data?.message || 'Error al crear la hoja de ruta')
      }
    })
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (error) return <div className="text-red-500">Error al cargar datos: {error instanceof Error ? error.message : JSON.stringify(error)}</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4 bg-gray-50 p-4 rounded-lg border">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Chofer *</label>
          <Input value={driver} onChange={e => setDriver(e.target.value)} placeholder="Nombre del chofer" />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Acompañante</label>
          <Input value={assistant} onChange={e => setAssistant(e.target.value)} placeholder="Nombre del acompañante (opcional)" />
        </div>
        <div className="flex-shrink-0">
          <Button onClick={handleCreateRoute} disabled={isCreating || selectedIds.length === 0 || !driver.trim()}>
            {isCreating ? 'Creando...' : 'Crear Hoja de Ruta'}
          </Button>
        </div>
      </div>

      {formError && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-md text-sm font-medium flex justify-between items-center">
          <span>{formError}</span>
          <button onClick={() => setFormError(null)} className="text-red-500 hover:text-red-900 font-bold px-2">&times;</button>
        </div>
      )}
      {formSuccess && (
        <div className="bg-green-50 text-green-700 border border-green-200 p-3 rounded-md text-sm font-medium">
          {formSuccess}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">Sel</TableHead>
              <TableHead>Nº OT</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Sillas</TableHead>
              <TableHead>Dirección de Entrega</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 h-24">
                  No hay órdenes en espera de reparto.
                </TableCell>
              </TableRow>
            ) : (
              orderList.map((ot) => (
                <TableRow key={ot._id}>
                  <TableCell className="text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer"
                      checked={selectedIds.includes(ot._id)}
                      onChange={() => handleToggleSelect(ot._id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">#{ot.orderNumber || ot._id.slice(-6).toUpperCase()}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{ot.cliente?.name || 'Consumidor Final'}</span>
                      {ot.condicionesComerciales?.observacionesReparto && (
                        <span className="text-xs text-red-600 bg-red-50 p-1 rounded mt-1 border border-red-100 flex items-start gap-1">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="truncate max-w-[200px]" title={ot.condicionesComerciales.observacionesReparto}>
                            {ot.condicionesComerciales.observacionesReparto}
                          </span>
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600 max-w-[200px] truncate" title={getOrdenSillasLabel(ot)}>
                    {getOrdenSillasLabel(ot)}
                  </TableCell>
                  <TableCell>
                    {ot.logistica?.direccionEntrega ? (
                      <span className="text-sm">
                        {ot.logistica.direccionEntrega} {ot.logistica.localidadEntrega ? `, ${ot.logistica.localidadEntrega}` : ''}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Sin dirección especificada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link to={`/ordenes-trabajo/${ot._id}`} target="_blank" className="text-blue-600 hover:underline text-sm">
                      Ver OT
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
