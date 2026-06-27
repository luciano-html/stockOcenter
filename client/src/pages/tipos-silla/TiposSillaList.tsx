import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import type { ChairTypeWithBOM } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function TiposSillaList() {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data, isLoading } = useQuery<{ data: ChairTypeWithBOM[] }>({
    queryKey: ['tipos-silla'],
    queryFn: () => api.get('/tipos-silla').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tipos-silla/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tipos-silla'] }); setDeleteId(null) },
  })

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.data.length ?? 0} tipos</p>
        {isAdmin && (
          <Link to="/tipos-silla/nuevo">
            <Button><Plus size={16} /> Nuevo tipo</Button>
          </Link>
        )}
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Componentes en BOM</TableHead>
              <TableHead>Activo</TableHead>
              {isAdmin && <TableHead className="w-24">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.data.map((t) => (
              <TableRow key={t._id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.bomCount ?? 0} componentes
                </TableCell>
                <TableCell>{t.active ? 'Sí' : 'No'}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Link to={`/tipos-silla/${t._id}`}>
                        <Button variant="ghost" size="icon"><Pencil size={16} /></Button>
                      </Link>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(t._id)}>
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {data?.data.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin tipos de silla</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogHeader><DialogTitle>¿Eliminar tipo de silla?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Se eliminará también su BOM. Las OT existentes no se verán afectadas.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
        </div>
      </Dialog>
    </div>
  )
}
