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
import { Plus, Pencil, Trash2, Search, Eye, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GoBack } from '@/components/shared/GoBack'

export default function ComponentesList() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const tipoFiltro = params.get('tipo') ?? ''
  const subtipoFiltro = params.get('subtipo') ?? ''
  const marcaFiltro = params.get('marca') ?? ''
  const stockBajoFiltro = params.get('stockBajo') === 'true'
  const page = Number(params.get('page') ?? '1')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showReserved, setShowReserved] = useState(false)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: Componente[]; pagination: Pagination }>({
    queryKey: ['componentes', search, tipoFiltro, subtipoFiltro, marcaFiltro, stockBajoFiltro, page],
    queryFn: () => api.get('/componentes', {
      params: {
        search: search || undefined,
        tipo: tipoFiltro || undefined,
        subtipo: subtipoFiltro || undefined,
        marca: marcaFiltro || undefined,
        stockBajo: stockBajoFiltro || undefined,
        page,
        limit: 50,
      },
    }).then((r) => r.data),
  })

  const { data: filtrosData } = useQuery<{ data: ComponenteFiltros }>({
    queryKey: ['componentes-filtros'],
    queryFn: () => api.get('/componentes/filtros').then((r) => r.data),
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

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Componentes</h1>
        {isAdmin && (
          <Link to="/componentes/nuevo">
            <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus size={16} className="mr-1" /> Nuevo componente</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
          <Input placeholder="Buscar componente..." className="pl-9" value={search} onChange={(e) => {
            const next = new URLSearchParams(params)
            e.target.value ? next.set('q', e.target.value) : next.delete('q')
            next.delete('page')
            setParams(next, { replace: true })
          }} />
        </div>
        <Select value={tipoFiltro} onChange={(e) => {
          const next = new URLSearchParams(params)
          e.target.value ? next.set('tipo', e.target.value) : next.delete('tipo')
          next.delete('page')
          setParams(next, { replace: true })
        }}>
          <option value="">Todos los tipos</option>
          {filtrosData?.data.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select value={subtipoFiltro} onChange={(e) => {
          const next = new URLSearchParams(params)
          e.target.value ? next.set('subtipo', e.target.value) : next.delete('subtipo')
          next.delete('page')
          setParams(next, { replace: true })
        }}>
          <option value="">Todos los sub-tipos</option>
          {filtrosData?.data.subTipos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={marcaFiltro} onChange={(e) => {
          const next = new URLSearchParams(params)
          e.target.value ? next.set('marca', e.target.value) : next.delete('marca')
          next.delete('page')
          setParams(next, { replace: true })
        }}>
          <option value="">Todas las marcas</option>
          {filtrosData?.data.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
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

      {(search || tipoFiltro || subtipoFiltro || marcaFiltro || stockBajoFiltro) && (
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
                    <TableCell>
                      {isBajo
                        ? <Badge variant="destructive"><AlertTriangle size={12} className="mr-1" /> Stock bajo</Badge>
                        : <Badge variant="secondary">Normal</Badge>
                      }
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Link to={`/componentes/${c._id}`}>
                            <Button variant="ghost" size="icon"><Pencil size={16} /></Button>
                          </Link>
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
    </div>
  )
}
