import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { WorkOrder } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Eye } from 'lucide-react'
import { useState } from 'react'
import { GoBack } from '@/components/shared/GoBack'

const statusClass: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 border-gray-300',
  en_progreso: 'bg-blue-100 text-blue-700 border-blue-300',
  pausada: 'bg-amber-100 text-amber-700 border-amber-300',
  finalizada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-red-100 text-red-700 border-red-300',
}

export default function OrdenesTrabajoList() {
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: WorkOrder[] }>({
    queryKey: ['ordenes-trabajo', estadoFiltro],
    queryFn: () => api.get('/ordenes-trabajo', { params: { estado: estadoFiltro || undefined } }).then((r) => r.data),
  })

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <Select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="w-48">
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="pausada">Pausada</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
        </Select>
        {isAdmin && (
          <Link to="/ordenes-trabajo/nuevo">
            <Button><Plus size={16} /> Nueva orden</Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipo de silla</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creada</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((ot) => (
              <TableRow key={ot._id}>
                <TableCell className="text-xs font-mono text-muted-foreground">#{ot._id.slice(-6)}</TableCell>
                <TableCell className="font-medium">{ot.chairTypeId.name}</TableCell>
                <TableCell>{ot.quantity}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusClass[ot.status]}>
                    {ot.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(ot.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Link to={`/ordenes-trabajo/${ot._id}`}>
                    <Button variant="ghost" size="icon"><Eye size={16} /></Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {data?.data.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin órdenes de trabajo</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
