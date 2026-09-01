import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { StockTransaction, Componente, Pagination } from '@/types'
import { getMovimientoSillasLabel } from '@/lib/ordenes'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/select'
import { Search, Eye } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface Props {
  movements: StockTransaction[]
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

function getReferenceLabel(m: StockTransaction) {
  if (m.referenceType !== 'work-order' || !m.referenceId) {
    return <span className="text-xs text-muted-foreground">—</span>
  }

  const ref = m.referenceId
  const workOrderId = typeof ref === 'string' ? ref : ref._id
  const shortId = workOrderId.slice(-6)
  const chairName = typeof ref === 'object' && ref ? getMovimientoSillasLabel(ref) : undefined

  const label = chairName ? `${chairName} · OT #${shortId}` : `OT #${shortId}`

  return (
    <Link
      to={`/ordenes-trabajo/${workOrderId}`}
      className="text-xs font-medium text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </Link>
  )
}

function getTransactionLabel(type: StockTransaction['type']) {
  switch (type) {
    case 'ingreso': return { label: 'Ingreso', color: 'success' }
    case 'egreso': return { label: 'Egreso', color: 'destructive' }
    case 'ingreso_masivo': return { label: 'Ingreso Masivo', color: 'success' }
    case 'consumo_orden': return { label: 'Consumo OT', color: 'destructive' }
    case 'ajuste': return { label: 'Ajuste', color: 'warning' }
    default: return { label: type, color: 'default' }
  }
}

export default function StockMovementsTable({
  movements, loading, compact, showNotes, showAuthor, showFilters, showPagination,
  componentOptions, filterComponentId, filterType, pagination, page = 1,
  onFilterComponentChange, onFilterTypeChange, onSearch, onPageChange,
}: Props) {
  const [selectedTx, setSelectedTx] = useState<StockTransaction | null>(null)

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
              <option value="ingreso">Ingreso Manual</option>
              <option value="egreso">Egreso Manual</option>
              <option value="ingreso_masivo">Ingreso Masivo</option>
              <option value="consumo_orden">Consumo OT</option>
            </Select>
          </div>
          {onSearch && (
            <Button variant="outline" onClick={onSearch}><Search size={16} /> Buscar</Button>
          )}
        </div>
      )}

      <div className={compact ? '' : 'max-h-[400px] overflow-y-auto border rounded-md'}>
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Ítems Afectados</TableHead>
              {showNotes && <TableHead>Notas</TableHead>}
              {showAuthor && <TableHead>Realizado por</TableHead>}
              <TableHead className="whitespace-nowrap">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((m) => {
              const txInfo = getTransactionLabel(m.type)
              return (
                <TableRow
                  key={m._id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedTx(m)}
                >
                  <TableCell>
                    <Badge variant={txInfo.color as any}>
                      {txInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getReferenceLabel(m)}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground flex items-center gap-2">
                    <span className="bg-muted px-2 py-1 rounded-md text-xs">{m.items.length} pieza/s</span>
                    <Eye size={14} className="text-primary/50" />
                  </TableCell>
                  {showNotes && (
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={(!m.notes || m.notes.includes('(OT #')) ? 'Sin notas adicionales' : m.notes}>
                      {(!m.notes || m.notes.includes('(OT #')) ? <span className="italic">Sin notas adicionales</span> : m.notes}
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
              )
            })}
            {movements.length === 0 && (
              <TableRow><TableCell colSpan={(showNotes ? 1 : 0) + (showAuthor ? 1 : 0) + 4} className="text-center text-muted-foreground py-8">Sin transacciones registradas</TableCell></TableRow>
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

      {/* Detalle de Transacción */}
      <Sheet open={!!selectedTx} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          {selectedTx && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2">
                  <Badge variant={getTransactionLabel(selectedTx.type).color as any}>
                    {getTransactionLabel(selectedTx.type).label}
                  </Badge>
                  Detalle de Transacción
                </SheetTitle>
                <SheetDescription>
                  Realizado el {formatDate(selectedTx.createdAt, false)}
                  {selectedTx.userId && ` por ${selectedTx.userId.name}`}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4">
                {selectedTx.referenceId && (
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    <strong>Referencia:</strong> {getReferenceLabel(selectedTx)}
                  </div>
                )}
                
                <div className="bg-muted/50 p-3 rounded-md text-sm">
                  <strong>Notas:</strong> {(!selectedTx.notes || selectedTx.notes.includes('(OT #')) ? <span className="text-muted-foreground italic">Sin notas adicionales</span> : selectedTx.notes}
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Piezas afectadas ({selectedTx.items.length}):</h4>
                  <div className="border rounded-md divide-y">
                    {selectedTx.items.map((item, idx) => {
                      const isIngreso = selectedTx.type.includes('ingreso')
                      const sign = isIngreso ? '+' : '-'
                      return (
                        <div key={idx} className="p-3 flex justify-between items-start gap-4">
                          <div>
                            <p className="font-medium text-sm">{item.componentId?.name}</p>
                            {(item.componentId?.tipo || item.componentId?.marca) && (
                              <p className="text-xs text-muted-foreground">
                                {[item.componentId.tipo, item.componentId.marca].filter(Boolean).join(' - ')}
                              </p>
                            )}
                            {item.notes && <p className="text-xs text-muted-foreground mt-1 text-primary/80">Nota: {item.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <span className={cn(
                              "font-bold text-sm",
                              isIngreso ? "text-green-600" : "text-destructive"
                            )}>
                              {sign}{item.quantity}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
