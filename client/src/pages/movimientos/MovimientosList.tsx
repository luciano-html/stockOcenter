import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { StockMovement, Pagination, Componente } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'

export default function MovimientosList() {
  const [params, setParams] = useState({ componenteId: '', tipo: '', page: 1 })
  const [filters, setFilters] = useState(params)

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-filter'],
    queryFn: () => api.get('/componentes').then((r) => r.data),
  })

  const { data, isLoading } = useQuery<{ data: StockMovement[]; pagination: Pagination }>({
    queryKey: ['movimientos', filters],
    queryFn: () => api.get('/stock/movimientos', { params: filters }).then((r) => r.data),
  })

  function buscar() { setFilters({ ...params, page: 1 }) }

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-2 items-end">
        <div className="w-full sm:w-48">
          <Select value={params.componenteId} onChange={(e) => setParams({ ...params, componenteId: e.target.value })}>
            <option value="">Todos los componentes</option>
            {compData?.data.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-36">
          <Select value={params.tipo} onChange={(e) => setParams({ ...params, tipo: e.target.value })}>
            <option value="">Todos</option>
            <option value="ingreso">Ingreso</option>
            <option value="egreso">Egreso</option>
          </Select>
        </div>
        <Button onClick={buscar}><Search size={16} /> Buscar</Button>
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Componente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((m) => (
                  <TableRow key={m._id}>
                    <TableCell className="text-sm">{new Date(m.createdAt).toLocaleString()}</TableCell>
                    <TableCell className="font-medium">{m.componentId?.name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={m.type === 'ingreso' ? 'secondary' : 'destructive'}>
                        {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{m.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.referenceType === 'work-order' ? `OT #${m.referenceId?.slice(-6)}` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.notes ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {data?.data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Pág. {filters.page} de {data.pagination.pages}
              </span>
              <Button variant="outline" size="sm" disabled={filters.page >= data.pagination.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
