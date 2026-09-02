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

export function ColaReparto() {
  const { data: workOrders, isLoading, error } = useQuery<{ data: WorkOrder[] }>({
    queryKey: ['ordenes-trabajo', { estado: 'espera_reparto' }],
    queryFn: async () => {
      const res = await api.get('/ordenes-trabajo', { params: { estado: 'espera_reparto', limit: 1000 } })
      return res.data
    },
  })

  const { mutate: createRoute, isPending: isCreating } = useCreateDeliveryRoute()

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [driver, setDriver] = useState('')
  const [assistant, setAssistant] = useState('')

  const orderList = workOrders?.data || []

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleCreateRoute = () => {
    if (!driver.trim()) return alert('Debe ingresar el nombre del chofer.')
    if (selectedIds.length === 0) return alert('Debe seleccionar al menos una orden.')
    
    createRoute({
      driver,
      assistant,
      orders: selectedIds
    }, {
      onSuccess: () => {
        setDriver('')
        setAssistant('')
        setSelectedIds([])
        alert('Hoja de Ruta creada exitosamente.')
      },
      onError: (err: any) => {
        alert(err?.response?.data?.message || 'Error al crear la hoja de ruta')
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
                  <TableCell className="font-medium text-gray-900">{ot.orderNumber}</TableCell>
                  <TableCell>{ot.cliente?.name || 'Consumidor Final'}</TableCell>
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
