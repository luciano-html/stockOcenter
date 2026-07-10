import { Link } from 'react-router-dom'
import type { StockMovement, Componente, Pagination } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface Props {
  movements: StockMovement[]
  loading?: boolean
  compact?: boolean
  showNotes?: boolean
  showAuthor?: boolean
  showFilters?: boolean
  showPagination?: boolean
  componentOptions?: Componente[]
  filterComponentId?: string
  filterType?: string
  pagination?: Pagination
  page?: number
  onFilterComponentChange?: (val: string) => void
  onFilterTypeChange?: (val: string) => void
  onSearch?: () => void
  onPageChange?: (page: number) => void
}

function formatDate(dateString: string, compact: boolean) {
  const d = new Date(dateString)
  if (compact) {
    return d.toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }
  return d.toLocaleString('es-AR')
}

function getReferenceLabel(m: StockMovement) {
  if (m.referenceType !== 'work-order' || !m.referenceId) {
    return <span className="text-xs text-muted-foreground">Componente/s</span>
  }

  const ref = m.referenceId
  const workOrderId = typeof ref === 'string' ? ref : ref._id
  const shortId = workOrderId.slice(-6)
  const chairName = typeof ref === 'object' && ref ? ref.chairTypeId?.name : undefined

  const label = chairName ? `${chairName} · OT #${shortId}` : `OT #${shortId}`

  return (
    <Link
      to={`/ordenes-trabajo/${workOrderId}`}
      className="text-xs font-medium text-primary hover:underline"
    >
      {label}
    </Link>
  )
}

export default function StockMovementsTable({
  movements, loading, compact, showNotes, showAuthor, showFilters, showPagination,
  componentOptions, filterComponentId, filterType, pagination, page = 1,
  onFilterComponentChange, onFilterTypeChange, onSearch, onPageChange,
}: Props) {
  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-48">
            <Select
              value={filterComponentId ?? ''}
              onChange={(e) => {
                onFilterComponentChange?.(e.target.value)
                onSearch?.()
              }}
            >
              <option value="">Todos los componentes</option>
              {componentOptions?.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select
              value={filterType ?? ''}
              onChange={(e) => {
                onFilterTypeChange?.(e.target.value)
                onSearch?.()
              }}
            >
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Select>
          </div>
          {onSearch && (
            <Button variant="outline" onClick={onSearch}><Search size={16} /> Buscar</Button>
          )}
        </div>
      )}

      <div className={compact ? '' : 'max-h-[400px] overflow-y-auto'}>
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Elemento</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Cant.</TableHead>
              {showNotes && <TableHead>Notas</TableHead>}
              {showAuthor && <TableHead>Realizado por</TableHead>}
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow key={m._id}>
                <TableCell>
                  {compact ? (
                    <Badge variant={m.type === 'ingreso' ? 'success' : 'destructive'}>
                      {m.type === 'ingreso' ? '+' : '−'}
                    </Badge>
                  ) : (
                    <Badge variant={m.type === 'ingreso' ? 'success' : 'destructive'}>
                      {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {m.componentId?.name ?? (m.referenceType === 'work-order'
                    ? (typeof m.referenceId === 'object' && m.referenceId?.chairTypeId?.name) || 'Orden de trabajo'
                    : '—')}
                  {m.componentId?.subtipo ? (
                    <span className="text-xs text-muted-foreground ml-1">({m.componentId.subtipo})</span>
                  ) : ''}
                </TableCell>
                <TableCell>
                  {getReferenceLabel(m)}
                </TableCell>
                <TableCell className={m.type === 'ingreso' ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                  {m.type === 'ingreso' ? '+' : '-'}{m.quantity}
                </TableCell>
                {showNotes && (
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={m.notes}>
                    {m.notes ?? '—'}
                  </TableCell>
                )}
                {showAuthor && (
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {m.userId ? `${m.userId.name} (${m.userId.role})` : '—'}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDate(m.createdAt, !!compact)}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow><TableCell colSpan={(showNotes ? 1 : 0) + (showAuthor ? 1 : 0) + 5} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showPagination && pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1}
            onClick={() => onPageChange?.(page - 1)}>
            Anterior
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            Pág. {page} de {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages}
            onClick={() => onPageChange?.(page + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
