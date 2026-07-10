import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { User, Pagination } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Trash2, Search, Shield, User as UserIcon, Users, ScrollText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { GoBack } from '@/components/shared/GoBack'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import AuditLogs from './AuditLogs'

const schema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(1, 'Requerido'),
  role: z.enum(['admin', 'operario']),
})

type FormData = z.infer<typeof schema>

export default function UsuariosList() {
  const [open, setOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [page, setPage] = useState(1)
  const [busqueda, setBusqueda] = useState('')
  const [activeTab, setActiveTab] = useState<'usuarios' | 'logs'>('usuarios')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ data: User[]; pagination: Pagination }>({
    queryKey: ['usuarios', page],
    queryFn: () => api.get('/auth/usuarios', { params: { page, limit: 50 } }).then((r) => r.data),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'operario' },
  })

  const createMutation = useMutation({
    mutationFn: (form: FormData) => api.post('/auth/register', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setOpen(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setDeleteId(null)
    },
  })

  const usuariosFiltrados = (data?.data ?? []).filter((u) => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return true
    return u.username.toLowerCase().includes(term) || u.name.toLowerCase().includes(term)
  })

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
        {activeTab === 'usuarios' && (
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setOpen(true)}>
            <Plus size={16} className="mr-1" /> Nuevo usuario
          </Button>
        )}
      </div>

      <div className="flex border-b">
        {[
          { key: 'usuarios', label: 'Usuarios', icon: Users },
          { key: 'logs', label: 'Logs de actividad', icon: ScrollText },
        ].map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as 'usuarios' | 'logs')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'usuarios' && (
        <>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
            <Input
              placeholder="Buscar usuario..."
              className="pl-9"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {isLoading ? <Skeleton className="h-64" /> : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-16 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell>{u.name}</TableCell>
                      <TableCell>
                        {u.role === 'admin'
                          ? <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50"><Shield size={12} className="mr-1" /> Admin</Badge>
                          : <Badge variant="outline" className="text-gray-700 border-gray-300 bg-gray-100"><UserIcon size={12} className="mr-1" /> Operario</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(u.id)}>
                            <Trash2 size={16} className="text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usuariosFiltrados.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      {busqueda ? 'No hay usuarios que coincidan' : 'Sin usuarios'}
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {activeTab === 'logs' && <AuditLogs />}

      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground py-2">Página {page} de {data.pagination.totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader><DialogTitle>Nuevo usuario</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(() => setConfirmCreate(true))} className="space-y-4 px-1">
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Input {...register('username')} />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select {...register('role')}>
              <option value="operario">Operario</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset() }}>Cancelar</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={createMutation.isPending}>Crear</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogHeader><DialogTitle>¿Eliminar usuario?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Esta acción no se puede deshacer.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
          <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Eliminar</Button>
        </div>
      </Dialog>

      <Dialog open={confirmCreate} onOpenChange={setConfirmCreate}>
        <DialogHeader><DialogTitle>¿Crear usuario?</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">Se creará un nuevo usuario con los datos ingresados.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmCreate(false)}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setConfirmCreate(false); handleSubmit((form) => createMutation.mutate(form))() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
