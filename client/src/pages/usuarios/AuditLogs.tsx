import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { AuditLog, AuditAction, User, Pagination } from '@/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

const actionLabels: Record<AuditAction, string> = {
  login_success: 'Inicio de sesión',
  login_failed: 'Login fallido',
  logout: 'Cierre de sesión',
  user_created: 'Usuario creado',
  user_deleted: 'Usuario eliminado',
  profile_updated: 'Perfil actualizado',
  stock_ingreso: 'Ingreso de stock',
  stock_ingreso_masivo: 'Ingreso masivo',
  stock_egreso: 'Egreso de stock',
  component_created: 'Componente creado',
  component_updated: 'Componente actualizado',
  component_deleted: 'Componente eliminado',
  chair_type_created: 'Tipo de silla creado',
  chair_type_updated: 'Tipo de silla actualizado',
  chair_type_deleted: 'Tipo de silla eliminado',
  work_order_created: 'OT creada',
  work_order_updated: 'OT actualizada',
  work_order_status_changed: 'Cambio de estado OT',
  work_order_finished: 'OT finalizada',
}

const actionOptions: AuditAction[] = [
  'login_success',
  'login_failed',
  'logout',
  'user_created',
  'user_deleted',
  'profile_updated',
  'stock_ingreso',
  'stock_ingreso_masivo',
  'stock_egreso',
  'component_created',
  'component_updated',
  'component_deleted',
  'chair_type_created',
  'chair_type_updated',
  'chair_type_deleted',
  'work_order_created',
  'work_order_updated',
  'work_order_status_changed',
  'work_order_finished',
]

const severityClass: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-300',
  warning: 'bg-amber-100 text-amber-700 border-amber-300',
  error: 'bg-red-100 text-red-700 border-red-300',
}

export default function AuditLogs() {
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [severity, setSeverity] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [page, setPage] = useState(1)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const { data: logsData, isLoading } = useQuery<{ data: AuditLog[]; pagination: Pagination }>({
    queryKey: ['audit-logs', userId, action, severity, desde, hasta, page],
    queryFn: () =>
      api
        .get('/auth/logs', {
          params: {
            userId: userId || undefined,
            action: action || undefined,
            severity: severity || undefined,
            desde: desde || undefined,
            hasta: hasta || undefined,
            page,
            limit: 50,
          },
        })
        .then((r) => r.data),
  })

  const { data: usersData } = useQuery<{ data: User[]; pagination: Pagination }>({
    queryKey: ['usuarios', 'all'],
    queryFn: () => api.get('/auth/usuarios', { params: { limit: 1000 } }).then((r) => r.data),
  })

  function toggleExpand(id: string) {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  function clearFilters() {
    setUserId('')
    setAction('')
    setSeverity('')
    setDesde('')
    setHasta('')
    setPage(1)
  }

  const hasFilters = userId || action || severity || desde || hasta

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Select value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1) }}>
          <option value="">Todos los usuarios</option>
          {(usersData?.data ?? []).map((u) => (
            <option key={u.id} value={u.id}>{u.username} ({u.name})</option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }}>
          <option value="">Todas las acciones</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{actionLabels[a]}</option>
          ))}
        </Select>
        <Select value={severity} onChange={(e) => { setSeverity(e.target.value); setPage(1) }}>
          <option value="">Todas las severidades</option>
          <option value="info">Info</option>
          <option value="warning">Advertencia</option>
          <option value="error">Error</option>
        </Select>
        <Input
          type="date"
          value={desde}
          onChange={(e) => { setDesde(e.target.value); setPage(1) }}
          placeholder="Desde"
        />
        <Input
          type="date"
          value={hasta}
          onChange={(e) => { setHasta(e.target.value); setPage(1) }}
          placeholder="Hasta"
        />
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <RotateCcw size={14} className="mr-1" /> Limpiar filtros
          </Button>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Severidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsData?.data.map((log) => {
              const isExpanded = expandedIds.has(log._id)
              return (
                <>
                  <TableRow key={log._id} className="cursor-pointer" onClick={() => toggleExpand(log._id)}>
                    <TableCell>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.userId
                        ? `${log.userId.username}`
                        : log.username
                        ? `${log.username} (no autenticado)`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{actionLabels[log.action] ?? log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">{log.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(severityClass[log.severity])}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={6} className="py-3">
                        <div className="text-sm space-y-2">
                          <p><span className="font-medium">IP:</span> {log.ip ?? '—'}</p>
                          <p><span className="font-medium">User Agent:</span> {log.userAgent ?? '—'}</p>
                          <div>
                            <p className="font-medium">Metadata:</p>
                            <pre className="text-xs bg-background border rounded p-2 mt-1 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )
            })}
            {logsData?.data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Sin logs que coincidan con los filtros
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {logsData?.pagination && logsData.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground py-2">
            Página {page} de {logsData.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= logsData.pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
