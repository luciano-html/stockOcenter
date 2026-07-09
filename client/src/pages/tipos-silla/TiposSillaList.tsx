import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { ChairTypeWithBOM, ComponenteFiltros, Pagination } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Eye, Pencil, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useState } from 'react'
import { GoBack } from '@/components/shared/GoBack'

export default function TiposSillaList() {
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const tipoFiltro = params.get('tipo') ?? ''
  const subtipoFiltro = params.get('subtipo') ?? ''
  const marcaFiltro = params.get('marca') ?? ''
  const page = Number(params.get('page') ?? '1')
  const sort = params.get('sort') ?? 'posibles'
  const order = params.get('order') ?? 'desc'
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: ChairTypeWithBOM[]; pagination: Pagination }>({
    queryKey: ['tipos-silla', search, tipoFiltro, subtipoFiltro, marcaFiltro, page, sort, order],
    queryFn: () =>
      api
        .get('/tipos-silla', {
          params: {
            q: search || undefined,
            tipo: tipoFiltro || undefined,
            subtipo: subtipoFiltro || undefined,
            marca: marcaFiltro || undefined,
            page,
            limit: 50,
            sort,
            order,
          },
        })
        .then((r) => r.data),
  })

  const { data: filtrosData } = useQuery<{ data: ComponenteFiltros }>({
    queryKey: ['componentes-filtros'],
    queryFn: () => api.get('/componentes/filtros').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tipos-silla/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-silla'] })
      setDeleteId(null)
    },
  })

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

  function toggleSort(field: 'nombre' | 'posibles' | 'activo') {
    const next = new URLSearchParams(params)
    if (sort === field) {
      next.set('order', order === 'asc' ? 'desc' : 'asc')
    } else {
      next.set('sort', field)
      next.set('order', 'desc')
    }
    next.delete('page')
    setParams(next, { replace: true })
  }

  function SortIcon({ field }: { field: 'nombre' | 'posibles' | 'activo' }) {
    if (sort !== field) return <ArrowUpDown size={14} className="text-muted-foreground" />
    return order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
  }

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar tipo de silla..."
            className="pl-9"
            value={search}
            onChange={(e) => updateParam('q', e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Select value={tipoFiltro} onChange={(e) => updateParam('tipo', e.target.value)} className="w-40">
            <option value="">Todos los tipos</option>
            {filtrosData?.data.tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Select value={subtipoFiltro} onChange={(e) => updateParam('subtipo', e.target.value)} className="w-40">
            <option value="">Todos los sub-tipos</option>
            {filtrosData?.data.subTipos.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={marcaFiltro} onChange={(e) => updateParam('marca', e.target.value)} className="w-40">
            <option value="">Todas las marcas</option>
            {filtrosData?.data.marcas.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </Select>
        </div>
        {isAdmin && (
          <Link to="/tipos-silla/nuevo">
            <Button><Plus size={16} /> Nuevo tipo</Button>
          </Link>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{data?.pagination.total ?? 0} tipos</p>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort('nombre')}
                  className="flex items-center gap-1 font-medium hover:text-primary"
                >
                  Nombre <SortIcon field="nombre" />
                </button>
              </TableHead>
              <TableHead>Componentes en lista</TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort('posibles')}
                  className="flex items-center gap-1 font-medium hover:text-primary"
                >
                  Posibles <SortIcon field="posibles" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  type="button"
                  onClick={() => toggleSort('activo')}
                  className="flex items-center gap-1 font-medium hover:text-primary"
                >
                  Activo <SortIcon field="activo" />
                </button>
              </TableHead>
              <TableHead className="w-24">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((t) => (
              <TableRow key={t._id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.bomCount ?? 0} componentes</TableCell>
                <TableCell className="font-bold">{t.sillasPosibles ?? 0}</TableCell>
                <TableCell>{t.active ? 'Sí' : 'No'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link to={`/tipos-silla/${t._id}`}>
                      <Button variant="ghost" size="icon" aria-label="Ver detalle"><Eye size={16} /></Button>
                    </Link>
                    {isAdmin && (
                      <>
                        <Link to={`/tipos-silla/${t._id}/editar`}>
                          <Button variant="ghost" size="icon" aria-label="Editar"><Pencil size={16} /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(t._id)} aria-label="Eliminar">
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {data?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin tipos de silla</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground py-2">Página {page} de {data.pagination.totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.pagination.totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            Siguiente
          </Button>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogHeader><DialogTitle>¿Eliminar tipo de silla?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Se eliminará también su lista de materiales. Las OT existentes no se verán afectadas.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
        </div>
      </Dialog>
    </div>
  )
}
