import { useNavigate } from 'react-router-dom'
import type { StockMovement, Componente, Pagination } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { Eye, Search } from 'lucide-react'

interface Props {
  movements: StockMovement[]
  loading?: boolean
  compact?: boolean
  showNotes?: boolean
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

export default function StockMovementsTable({
  movements, loading, compact, showNotes, showFilters, showPagination,
  componentOptions, filterComponentId, filterType, pagination, page = 1,
  onFilterComponentChange, onFilterTypeChange, onSearch, onPageChange,
}: Props) {
  const navigate = useNavigate()

  if (loading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="w-full sm:w-48">
            <Select value={filterComponentId ?? ''} onChange={(e) => onFilterComponentChange?.(e.target.value)}>
              <option value="">Todos los componentes</option>
              {componentOptions?.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div className="w-full sm:w-36">
            <Select value={filterType ?? ''} onChange={(e) => onFilterTypeChange?.(e.target.value)}>
              <option value="">Todos</option>
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
            </Select>
          </div>
          <Button onClick={onSearch}><Search size={16} /> Buscar</Button>
        </div>
      )}

      <div className={compact ? '' : 'max-h-[400px] overflow-y-auto'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Elemento</TableHead>
              <TableHead>Cant.</TableHead>
              {showNotes && <TableHead>Notas</TableHead>}
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => (
              <TableRow key={m._id}>
                <TableCell>
                  {compact ? (
                    <span className={m.type === 'ingreso' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                      {m.type === 'ingreso' ? 'ING' : 'EGR'}
                    </span>
                  ) : (
                    <Badge variant={m.type === 'ingreso' ? 'secondary' : 'destructive'}>
                      {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {m.referenceType === 'work-order'
                    ? <span>Silla {m.referenceId?.chairTypeId?.name ?? ''}</span>
                    : <span>{m.componentId?.name ?? '—'}{m.componentId?.subtipo ? <span className="text-xs text-muted-foreground ml-1">({m.componentId.subtipo})</span> : ''}</span>
                  }
                </TableCell>
                <TableCell className={m.type === 'ingreso' ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                  {m.type === 'ingreso' ? '+' : '-'}{m.quantity}
                </TableCell>
                {showNotes && (
                  <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{m.notes ?? '—'}</TableCell>
                )}
                <TableCell className="whitespace-nowrap text-xs">
                  {new Date(m.createdAt).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  {m.referenceType === 'work-order' && m.referenceId && (
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/ordenes-trabajo/${typeof m.referenceId === 'object' && m.referenceId ? m.referenceId._id : m.referenceId}`)}>
                      <Eye size={16} />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow><TableCell colSpan={showNotes ? 6 : 5} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
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
