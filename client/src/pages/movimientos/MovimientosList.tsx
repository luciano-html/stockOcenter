import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import type { StockMovement, Pagination, Componente } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GoBack } from '@/components/shared/GoBack'

export default function MovimientosList() {
  const [params, setParams] = useSearchParams()
  const componenteId = params.get('componenteId') ?? ''
  const tipo = params.get('tipo') ?? ''
  const page = Number(params.get('page') ?? '1')

  const filters = {
    componenteId,
    tipo,
    page,
  }

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-filter'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const { data, isLoading } = useQuery<{ data: StockMovement[]; pagination: Pagination }>({
    queryKey: ['movimientos', filters],
    queryFn: () => api.get('/stock/movimientos', { params: filters }).then((r) => r.data),
  })

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    next.set('page', '1')
    setParams(next, { replace: true })
  }

  function buscar() {
    const next = new URLSearchParams(params)
    next.set('page', '1')
    setParams(next, { replace: true })
  }

  const hasFilters = componenteId || tipo

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History size={24} />
          Historial de movimientos
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Select value={componenteId} onChange={(e) => updateParam('componenteId', e.target.value)}>
          <option value="">Todos los componentes</option>
          {compData?.data.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </Select>
        <Select value={tipo} onChange={(e) => updateParam('tipo', e.target.value)}>
          <option value="">Todos los tipos</option>
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </Select>
        <Button onClick={buscar} className="bg-green-600 hover:bg-green-700 text-white">
          <Search size={16} className="mr-1" /> Buscar
        </Button>
        {hasFilters && (
          <Button variant="outline" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Limpiar
          </Button>
        )}
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Elemento</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((m) => {
                  const isWorkOrder = m.referenceType === 'work-order' && m.referenceId
                  const workOrderId = isWorkOrder
                    ? (typeof m.referenceId === 'string' ? m.referenceId : m.referenceId?._id)
                    : undefined
                  const shortId = workOrderId?.slice(-6)
                  const chairName = isWorkOrder && typeof m.referenceId === 'object'
                    ? m.referenceId?.chairTypeId?.name
                    : undefined

                  return (
                    <TableRow key={m._id}>
                      <TableCell className="text-sm">{new Date(m.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">
                        {m.componentId?.name ?? (chairName || 'Orden de trabajo')}
                        {m.componentId?.subtipo ? <span className="text-xs text-muted-foreground ml-1">({m.componentId.subtipo})</span> : ''}
                      </TableCell>
                      <TableCell>
                        {isWorkOrder ? (
                          <Link to={`/ordenes-trabajo/${workOrderId}`} className="text-sm font-medium text-primary hover:underline">
                            {chairName ? `${chairName} · OT #${shortId}` : `OT #${shortId}`}
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">Componente/s</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          m.type === 'ingreso'
                            ? 'text-green-700 border-green-300 bg-green-50'
                            : 'text-destructive border-destructive/50 bg-destructive/10'
                        )} variant="outline">
                          {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{m.quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.notes ?? '—'}</TableCell>
                    </TableRow>
                  )
                })}
                {data?.data.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => updateParam('page', String(page - 1))}>
                Anterior
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Pág. {page} de {data.pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages}
                onClick={() => updateParam('page', String(page + 1))}>
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
