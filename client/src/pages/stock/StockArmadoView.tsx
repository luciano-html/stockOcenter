import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { WorkOrder } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { getOrdenSillas } from '@/lib/ordenes'
import { GoBack } from '@/components/shared/GoBack'

export default function StockArmadoView() {
  const { data: workOrders, isLoading, error } = useQuery<{ data: WorkOrder[] }>({
    queryKey: ['ordenes-trabajo', { estado: 'espera_reparto' }],
    queryFn: async () => {
      const res = await api.get('/ordenes-trabajo', { params: { estado: 'espera_reparto', limit: 1000 } })
      return res.data
    },
  })

  const orderList = workOrders?.data || []

  const chairSums = useMemo(() => {
    const sums: Record<string, { name: string; quantity: number }> = {}
    orderList.forEach(order => {
      const sillas = getOrdenSillas(order)
      sillas.forEach(silla => {
        const id = silla.chairTypeId._id
        if (!sums[id]) {
          sums[id] = { name: silla.chairTypeId.name, quantity: 0 }
        }
        sums[id].quantity += silla.quantity
      })
    })
    return Object.values(sums).sort((a, b) => b.quantity - a.quantity)
  }, [orderList])

  const totalSillas = chairSums.reduce((acc, c) => acc + c.quantity, 0)

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return <div className="text-red-500 p-4 md:p-8">Error al cargar datos.</div>
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <GoBack to="/" />
        <h1 className="text-2xl font-bold">Stock Armado (Espera de Reparto)</h1>
      </div>

      <div className="bg-white rounded-lg shadow border p-6">
        <p className="text-gray-600 mb-6">
          Cantidad total de sillas armadas correspondientes a órdenes finalizadas que están esperando ser asignadas a una Hoja de Ruta.
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Silla</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chairSums.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-gray-500 h-24">
                  No hay stock en espera de reparto.
                </TableCell>
              </TableRow>
            ) : (
               chairSums.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {chairSums.length > 0 && (
            <TableHeader>
              <TableRow className="bg-gray-50 font-bold hover:bg-gray-50">
                <TableHead className="text-gray-900">Total General</TableHead>
                <TableHead className="text-right text-gray-900">{totalSillas}</TableHead>
              </TableRow>
            </TableHeader>
          )}
        </Table>
      </div>
    </div>
  )
}
