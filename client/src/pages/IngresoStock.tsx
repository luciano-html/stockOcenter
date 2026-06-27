import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/services/api'
import type { Componente, StockMovement, Pagination } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Eye } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'

export default function IngresoStock() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [ingresoComp, setIngresoComp] = useState('')
  const [ingresoCant, setIngresoCant] = useState('1')
  const [ingresoNotas, setIngresoNotas] = useState('')

  const [egresoComp, setEgresoComp] = useState('')
  const [egresoCant, setEgresoCant] = useState('1')
  const [egresoNotas, setEgresoNotas] = useState('')

  const [movParams, setMovParams] = useState({ componenteId: '', tipo: '', page: 1 })
  const [movFilters, setMovFilters] = useState(movParams)

  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmAction, setConfirmAction] = useState<'ingreso' | 'egreso' | null>(null)

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-ingreso'],
    queryFn: () => api.get('/componentes', { params: { limit: 200 } }).then((r) => r.data),
  })

  const { data: recentData } = useQuery<{ data: StockMovement[] }>({
    queryKey: ['movimientos-recent'],
    queryFn: () => api.get('/stock/movimientos', { params: { limit: 15 } }).then((r) => r.data),
    refetchInterval: 10000,
  })

  const { data: movData, isLoading: movLoading } = useQuery<{ data: StockMovement[]; pagination: Pagination }>({
    queryKey: ['movimientos-stock', movFilters],
    queryFn: () => api.get('/stock/movimientos', { params: movFilters }).then((r) => r.data),
  })

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['componentes'] })
    queryClient.invalidateQueries({ queryKey: ['componentes-ingreso'] })
    queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos-stock'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
    queryClient.invalidateQueries({ queryKey: ['movimientos-recent-dash'] })
  }

  const ingresoMutation = useMutation({
    mutationFn: () => api.post('/stock/ingreso', { componenteId: ingresoComp, cantidad: Number(ingresoCant), notas: ingresoNotas || undefined }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg('✓ Stock cargado correctamente')
      setErrorMsg('')
      setIngresoComp('')
      setIngresoCant('1')
      setIngresoNotas('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Error al cargar stock')
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const egresoMutation = useMutation({
    mutationFn: () => api.post('/stock/egreso', { componenteId: egresoComp, cantidad: Number(egresoCant), notas: egresoNotas || undefined }),
    onSuccess: () => {
      invalidateAll()
      setSuccessMsg('✓ Egreso registrado correctamente')
      setErrorMsg('')
      setEgresoComp('')
      setEgresoCant('1')
      setEgresoNotas('')
      setTimeout(() => setSuccessMsg(''), 3000)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setErrorMsg(err?.response?.data?.message ?? 'Error al registrar egreso')
      setTimeout(() => setErrorMsg(''), 5000)
    },
  })

  const selectedIngreso = compData?.data.find((c) => c._id === ingresoComp)
  const selectedEgreso = compData?.data.find((c) => c._id === egresoComp)

  return (
    <div className="space-y-4">
      <GoBack />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Ingreso de stock</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Componente</Label>
                <Select value={ingresoComp} onChange={(e) => setIngresoComp(e.target.value)}>
                  <option value="">Seleccionar componente...</option>
                  {compData?.data.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.tipo}{c.marca ? ` - ${c.marca}` : ''}) — disp. {c.stockDisponible} {c.unit}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedIngreso && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                  <p>Stock actual: <strong>{selectedIngreso.stockActual}</strong> {selectedIngreso.unit}</p>
                  <p>Reservado: <strong>{selectedIngreso.stockReservado}</strong> {selectedIngreso.unit}</p>
                  <p>Disponible: <strong>{selectedIngreso.stockDisponible}</strong> {selectedIngreso.unit}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cantidad recibida</Label>
                <Input type="text" inputMode="numeric" value={ingresoCant} onChange={(e) => setIngresoCant(e.target.value.replace(/\D/g, ''))} />
              </div>

              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input placeholder="ej. Nro de remito, proveedor..." value={ingresoNotas} onChange={(e) => setIngresoNotas(e.target.value)} />
              </div>

              <Button className="w-full" disabled={!ingresoComp || !ingresoCant || Number(ingresoCant) < 1 || ingresoMutation.isPending} onClick={() => setConfirmAction('ingreso')}>
                {ingresoMutation.isPending ? 'Cargando...' : 'Cargar stock'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Egreso de stock</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Componente</Label>
                <Select value={egresoComp} onChange={(e) => setEgresoComp(e.target.value)}>
                  <option value="">Seleccionar componente...</option>
                  {compData?.data.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.tipo}{c.marca ? ` - ${c.marca}` : ''}) — disp. {c.stockDisponible} {c.unit}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedEgreso && (
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md space-y-1">
                  <p>Stock actual: <strong>{selectedEgreso.stockActual}</strong> {selectedEgreso.unit}</p>
                  <p>Reservado: <strong>{selectedEgreso.stockReservado}</strong> {selectedEgreso.unit}</p>
                  <p>Disponible: <strong>{selectedEgreso.stockDisponible}</strong> {selectedEgreso.unit}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Cantidad a retirar</Label>
                <Input type="text" inputMode="numeric" value={egresoCant} onChange={(e) => setEgresoCant(e.target.value.replace(/\D/g, ''))} />
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Input placeholder="ej. Devolución, ajuste, consumo..." value={egresoNotas} onChange={(e) => setEgresoNotas(e.target.value)} />
              </div>

              <Button className="w-full" variant="destructive" disabled={!egresoComp || egresoCant < 1 || egresoMutation.isPending} onClick={() => setConfirmAction('egreso')}>
                {egresoMutation.isPending ? 'Procesando...' : 'Retirar stock'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {successMsg && (
          <p className="text-sm text-green-600 text-center font-medium">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="text-sm text-destructive text-center font-medium">{errorMsg}</p>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Últimos movimientos</CardTitle></CardHeader>
          <CardContent>
            {!recentData?.data.length ? (
              <p className="text-sm text-muted-foreground">Sin movimientos registrados</p>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Elemento</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="whitespace-nowrap">Fecha</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentData.data.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell>
                          <span className={m.type === 'ingreso' ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {m.type === 'ingreso' ? 'ING' : 'EGR'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {m.referenceType === 'work-order'
                            ? <span className="font-medium">Silla {m.referenceId?.chairTypeId?.name ?? ''}</span>
                            : m.componentId?.name ?? '—'
                          }
                        </TableCell>
                        <TableCell className={m.type === 'ingreso' ? 'text-green-600' : 'text-destructive'}>
                          {m.type === 'ingreso' ? '+' : '-'}{m.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">{m.notes ?? '-'}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(m.createdAt).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell>
                          {m.referenceType === 'work-order' && m.referenceId && (
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/ordenes-trabajo/${m.referenceId._id ?? m.referenceId}`)}>
                              <Eye size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Todo el historial</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="w-full sm:w-48">
                <Select value={movParams.componenteId} onChange={(e) => setMovParams({ ...movParams, componenteId: e.target.value })}>
                  <option value="">Todos los componentes</option>
                  {compData?.data.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="w-full sm:w-36">
                <Select value={movParams.tipo} onChange={(e) => setMovParams({ ...movParams, tipo: e.target.value })}>
                  <option value="">Todos</option>
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </Select>
              </div>
              <Button onClick={() => setMovFilters({ ...movParams, page: 1 })}><Search size={16} /> Buscar</Button>
            </div>

            {movLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Elemento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movData?.data.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {m.referenceType === 'work-order'
                            ? <span>Silla {m.referenceId?.chairTypeId?.name ?? ''}</span>
                            : m.componentId?.name ?? '—'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={m.type === 'ingreso' ? 'secondary' : 'destructive'}>
                            {m.type === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </Badge>
                        </TableCell>
                        <TableCell className={m.type === 'ingreso' ? 'text-green-600 font-bold' : 'text-destructive font-bold'}>
                          {m.type === 'ingreso' ? '+' : '-'}{m.quantity}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{m.notes ?? '—'}</TableCell>
                        <TableCell>
                          {m.referenceType === 'work-order' && m.referenceId && (
                            <Button variant="ghost" size="icon" onClick={() => navigate(`/ordenes-trabajo/${m.referenceId._id ?? m.referenceId}`)}>
                              <Eye size={16} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {movData?.data.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {movData?.pagination && movData.pagination.pages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={movFilters.page <= 1}
                  onClick={() => setMovFilters({ ...movFilters, page: movFilters.page - 1 })}>
                  Anterior
                </Button>
                <span className="flex items-center text-sm text-muted-foreground">
                  Pág. {movFilters.page} de {movData.pagination.pages}
                </span>
                <Button variant="outline" size="sm" disabled={movFilters.page >= movData.pagination.pages}
                  onClick={() => setMovFilters({ ...movFilters, page: movFilters.page + 1 })}>
                  Siguiente
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>

      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmAction === 'ingreso' ? '¿Cargar stock?' : '¿Retirar stock?'}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {confirmAction === 'ingreso'
            ? `Se agregarán ${Number(ingresoCant)} unidades de ${selectedIngreso?.name ?? ''} al stock.`
            : `Se retirarán ${Number(egresoCant)} unidades de ${selectedEgreso?.name ?? ''} del stock.`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancelar</Button>
          <Button
            variant={confirmAction === 'egreso' ? 'destructive' : 'default'}
            onClick={() => {
              setConfirmAction(null)
              if (confirmAction === 'ingreso') ingresoMutation.mutate()
              else egresoMutation.mutate()
            }}
          >Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
