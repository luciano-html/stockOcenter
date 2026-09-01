import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { Componente, ComponenteFiltros, ReservaItem, Pagination, StockResumen } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search, Eye, AlertTriangle, Package } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import ComponenteForm from './ComponenteForm'
import { GoBack } from '@/components/shared/GoBack'

export default function ComponentesList() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const tipoFiltro = params.get('tipo') ?? ''
  const subtipoFiltro = params.get('subtipo') ?? ''
  const stockBajoFiltro = params.get('stockBajo') === 'true'
  const actionParam = params.get('action')
  const page = Number(params.get('page') ?? '1')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const [showReserved, setShowReserved] = useState(false)

  useEffect(() => {
    if (actionParam === 'new') {
      setEditId(undefined)
      setSheetOpen(true)
      const next = new URLSearchParams(params)
      next.delete('action')
      setParams(next, { replace: true })
    }
  }, [actionParam, params, setParams])
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: Componente[]; pagination: Pagination }>({
    queryKey: ['componentes', search, tipoFiltro, subtipoFiltro, stockBajoFiltro, page],
    queryFn: () => api.get('/componentes', {
      params: {
        search: search || undefined,
        tipo: tipoFiltro || undefined,
        subtipo: subtipoFiltro || undefined,
        stockBajo: stockBajoFiltro || undefined,
        page,
        limit: 50,
      },
    }).then((r) => r.data),
  })

  const { data: filtrosData } = useQuery<{ data: ComponenteFiltros }>({
    queryKey: ['componentes-filtros', tipoFiltro],
    queryFn: () => api.get('/componentes/filtros', {
      params: {
        tipo: tipoFiltro || undefined,
      },
    }).then((r) => r.data),
  })

  const { data: resumenData } = useQuery<{ data: StockResumen }>({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/componentes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['componentes'] }); setDeleteId(null) },
  })

  const { data: reservasData } = useQuery<{ data: ReservaItem[] }>({
    queryKey: ['componentes-reservas'],
    queryFn: () => api.get('/componentes/reservas').then((r) => r.data),
    refetchInterval: 30000,
  })

  const reservas = reservasData?.data ?? []
  const stockBajoCount = (resumenData?.data.componentes ?? []).filter((c) => c.stockBajo).length

  const totalTipos = useMemo(
    () => (filtrosData?.data.tiposCount ?? []).reduce((sum, t) => sum + t.count, 0),
    [filtrosData]
  )

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setParams(next, { replace: true })
  }

  function clearFilters() {
    const next = new URLSearchParams()
    setParams(next, { replace: true })
  }

  function toggleStockBajo() {
    const next = new URLSearchParams(params)
    if (stockBajoFiltro) {
      next.delete('stockBajo')
    } else {
      next.set('stockBajo', 'true')
    }
    next.delete('page')
    setParams(next, { replace: true })
  }

  function getDisponibleBadgeVariant(value: number, minimo: number): 'destructive' | 'warning' | 'success' {
    if (value <= minimo) return 'destructive'
    if (value <= minimo * 2) return 'warning'
    return 'success'
  }

  function handleOpenCreate() {
    setEditId(undefined)
    setSheetOpen(true)
  }

  function handleOpenEdit(id: string) {
    setEditId(id)
    setSheetOpen(true)
  }

  return (
    <div className="space-y-4">
      <GoBack to="/" />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Componentes</h1>
        {isAdmin && (
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleOpenCreate}>
            <Plus size={16} className="mr-1" /> Nuevo componente
          </Button>
        )}
      </div>

      <div className="flex border-b flex-wrap">
        <button
          type="button"
          onClick={() => updateParam('tipo', '')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tipoFiltro === ''
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Package size={16} />
          <span>Todas</span>
          <span className={cn('text-xs', tipoFiltro === '' ? 'opacity-70' : 'text-muted-foreground/70')}>({totalTipos})</span>
        </button>
        {(filtrosData?.data.tiposCount ?? []).map((t) => {
          const isActive = tipoFiltro === t.tipo
          return (
            <button
              key={t.tipo}
              type="button"
              onClick={() => updateParam('tipo', t.tipo)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Package size={16} />
              <span>{t.tipo}</span>
              <span className={cn('text-xs', isActive ? 'opacity-70' : 'text-muted-foreground/70')}>({t.count})</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          <Input placeholder="Buscar componente..." className="pl-9" value={search} onChange={(e) => {
            const next = new URLSearchParams(params)
            e.target.value ? next.set('q', e.target.value) : next.delete('q')
            next.delete('page')
            setParams(next, { replace: true })
          }} />
        </div>
        <Select value={subtipoFiltro} onChange={(e) => {
          const next = new URLSearchParams(params)
          e.target.value ? next.set('subtipo', e.target.value) : next.delete('subtipo')
          next.delete('page')
          setParams(next, { replace: true })
        }}>
          <option value="">Todos los sub-tipos</option>
          {filtrosData?.data.subTipos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={stockBajoFiltro ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleStockBajo}
            className="flex-1 whitespace-nowrap"
          >
            Stock bajo {stockBajoCount > 0 && `(${stockBajoCount})`}
          </Button>
          {reservas.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowReserved(true)} className="flex-1 whitespace-nowrap">
              <Eye size={16} className="mr-1" /> En reserva ({reservas.length})
            </Button>
          )}
        </div>
      </div>

      {(search || tipoFiltro || subtipoFiltro || stockBajoFiltro) && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </div>
      )}

      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sub-tipo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead>Estado</TableHead>
                {isAdmin && <TableHead className="w-24 text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((c) => {
                const isBajo = c.stockBajo
                return (
                  <TableRow key={c._id} className={cn(isBajo && 'bg-red-50/60')}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.subtipo || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.marca || '—'}</TableCell>
                    <TableCell className={cn('text-right', c.stockReservado > 0 && 'text-amber-600 font-bold')}>{c.stockReservado}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getDisponibleBadgeVariant(c.stockDisponible, c.stockMinimo)}>
                        {c.stockDisponible}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.stockMinimo}</TableCell>
                    <TableCell className="text-right">${(c.precio ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {isBajo
                        ? <Badge variant="destructive"><AlertTriangle size={12} className="mr-1" /> Stock bajo</Badge>
                        : <Badge variant="secondary">Normal</Badge>
                      }
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(c._id)}><Pencil size={16} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(c._id)}>
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {data?.data.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground py-8">Sin componentes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1}
            onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page - 1)); setParams(next, { replace: true }) }}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground py-2">
            Página {page} de {data.pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages}
            onClick={() => { const next = new URLSearchParams(params); next.set('page', String(page + 1)); setParams(next, { replace: true }) }}>
            Siguiente
          </Button>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogHeader><DialogTitle>¿Eliminar componente?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
        </div>
      </Dialog>

      <Dialog open={showReserved} onOpenChange={setShowReserved}>
        <DialogHeader><DialogTitle>Componentes en reserva ({reservas.length})</DialogTitle></DialogHeader>
        <div className="max-h-[400px] overflow-y-auto space-y-4 p-1">
          {reservas.map((r) => (
            <div key={r.componente._id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{r.componente.name}</span>
                <span className="text-amber-600 font-bold text-sm">{r.cantidadReservada} reservado</span>
              </div>
              <div className="space-y-1">
                {r.ordenes.map((ot) => (
                  <Link
                    key={ot.id}
                    to={`/ordenes-trabajo/${ot.id}`}
                    className="flex items-center justify-between text-sm bg-muted rounded px-2 py-1.5 hover:bg-muted/80 transition-colors"
                  >
                    <span className="text-muted-foreground">
                      OT <span className="font-mono text-xs">{ot.id.slice(-6)}</span>
                    </span>
                    <span className="font-medium">{ot.silla}</span>
                    <span className="text-muted-foreground">x{ot.cantidad}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dialog>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] sm:max-w-none overflow-y-auto">
          {sheetOpen && (
            <ComponenteForm 
              componentId={editId} 
              onSuccess={() => setSheetOpen(false)} 
              onCancel={() => setSheetOpen(false)} 
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
