import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { Componente, ComponenteFiltros } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useState } from 'react'

export default function ComponentesList() {
  const [search, setSearch] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [marcaFiltro, setMarcaFiltro] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes', search, tipoFiltro, marcaFiltro],
    queryFn: () => api.get('/componentes', {
      params: {
        search: search || undefined,
        tipo: tipoFiltro || undefined,
        marca: marcaFiltro || undefined,
      },
    }).then((r) => r.data),
  })

  const { data: filtrosData } = useQuery<{ data: ComponenteFiltros }>({
    queryKey: ['componentes-filtros'],
    queryFn: () => api.get('/componentes/filtros').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/componentes/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['componentes'] }); setDeleteId(null) },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input placeholder="Buscar componente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="w-40">
            <option value="">Todos los tipos</option>
            {filtrosData?.data.tipos.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)} className="w-40">
            <option value="">Todas las marcas</option>
            {filtrosData?.data.marcas.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
        </div>
        {isAdmin && (
          <Link to="/componentes/nuevo">
            <Button><Plus size={16} /> Nuevo componente</Button>
          </Link>
        )}
      </div>

      {isLoading ? <Skeleton className="h-64" /> : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Marca</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Disponible</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Estado</TableHead>
                {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((c) => (
                <TableRow key={c._id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.tipo}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.marca}</TableCell>
                  <TableCell>{c.unit}</TableCell>
                  <TableCell className="font-bold">{c.stockDisponible}</TableCell>
                  <TableCell>{c.stockMinimo}</TableCell>
                  <TableCell>
                    {c.stockBajo
                      ? <Badge variant="destructive">Stock bajo</Badge>
                      : <Badge variant="secondary">Normal</Badge>
                    }
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-1">
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
              ))}
              {data?.data.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-8">Sin componentes</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
    </div>
  )
}
