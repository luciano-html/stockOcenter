import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { ChairType, Componente } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { GoBack } from '@/components/shared/GoBack'
import { Plus, Trash2, Package, Wrench } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

type ItemRow = { componentId: string; componentName: string; quantity: string }

export default function OrdenTrabajoForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showConfirm, setShowConfirm] = useState(false)
  const [chairTypeId, setChairTypeId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [adicionales, setAdicionales] = useState<ItemRow[]>([])
  const [repuestos, setRepuestos] = useState<ItemRow[]>([])
  const [newCompAdic, setNewCompAdic] = useState('')
  const [newCantAdic, setNewCantAdic] = useState('1')
  const [newCompRep, setNewCompRep] = useState('')
  const [newCantRep, setNewCantRep] = useState('1')

  const { data: tiposData, isLoading } = useQuery<{ data: ChairType[] }>({
    queryKey: ['tipos-silla-select'],
    queryFn: () => api.get('/tipos-silla').then((r) => r.data),
  })

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-ot-form'],
    queryFn: () => api.get('/componentes', { params: { limit: 200 } }).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: () => api.post('/ordenes-trabajo', {
      ...(chairTypeId ? { chairTypeId } : {}),
      quantity: Number(quantity),
      items: [
        ...adicionales.map((i) => ({ componentId: i.componentId, quantity: Number(i.quantity), type: 'adicional' as const })),
        ...repuestos.map((i) => ({ componentId: i.componentId, quantity: Number(i.quantity), type: 'repuesto' as const })),
      ],
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      navigate(`/ordenes-trabajo/${res.data.data._id}`)
    },
  })

  if (isLoading) return <Skeleton className="h-64" />

  return (
    <div className="space-y-4">
      <GoBack />
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>Nueva orden de trabajo</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="chairTypeId">Tipo de silla <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Select id="chairTypeId" value={chairTypeId} onChange={(e) => setChairTypeId(e.target.value)}>
              <option value="">Solo repuestos</option>
              {tiposData?.data.filter((t) => t.active).map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input id="quantity" type="text" inputMode="numeric" value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))} />
          </div>
        </div>

        {chairTypeId && (
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-muted-foreground" />
            <Label className="text-sm font-medium">Adicionales a la silla</Label>
            <span className="text-xs text-muted-foreground">(componentes extra que forman parte de la silla, ej. aro prolongador)</span>
          </div>
          {adicionales.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adicionales.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.componentName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setAdicionales(adicionales.filter((_, i) => i !== idx))}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={newCompAdic} onChange={(e) => setNewCompAdic(e.target.value)}>
                <option value="">Seleccionar componente...</option>
                {compData?.data.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.tipo}{c.marca ? ` - ${c.marca}` : ''}) — disp. {c.stockDisponible} {c.unit}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-24">
              <Input type="text" inputMode="numeric" placeholder="Cant." value={newCantAdic}
                onChange={(e) => setNewCantAdic(e.target.value.replace(/\D/g, ''))} />
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              const comp = compData?.data.find((c) => c._id === newCompAdic)
              if (!comp || !newCantAdic || Number(newCantAdic) < 1) return
              setAdicionales([...adicionales, { componentId: newCompAdic, componentName: comp.name, quantity: newCantAdic }])
              setNewCompAdic('')
              setNewCantAdic('1')
            }} disabled={!newCompAdic || !newCantAdic || Number(newCantAdic) < 1}>
              <Plus size={16} />
            </Button>
          </div>
        </div>
        )}

        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-muted-foreground" />
            <Label className="text-sm font-medium">Repuestos</Label>
            <span className="text-xs text-muted-foreground">(componentes sueltos no vinculados a la silla, ej. ruedas extra)</span>
          </div>
          {repuestos.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Componente</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repuestos.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.componentName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setRepuestos(repuestos.filter((_, i) => i !== idx))}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Select value={newCompRep} onChange={(e) => setNewCompRep(e.target.value)}>
                <option value="">Seleccionar componente...</option>
                {compData?.data.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.tipo}{c.marca ? ` - ${c.marca}` : ''}) — disp. {c.stockDisponible} {c.unit}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-24">
              <Input type="text" inputMode="numeric" placeholder="Cant." value={newCantRep}
                onChange={(e) => setNewCantRep(e.target.value.replace(/\D/g, ''))} />
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              const comp = compData?.data.find((c) => c._id === newCompRep)
              if (!comp || !newCantRep || Number(newCantRep) < 1) return
              setRepuestos([...repuestos, { componentId: newCompRep, componentName: comp.name, quantity: newCantRep }])
              setNewCompRep('')
              setNewCantRep('1')
            }} disabled={!newCompRep || !newCantRep || Number(newCantRep) < 1}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/ordenes-trabajo')}>Cancelar</Button>
          <Button onClick={() => setShowConfirm(true)} disabled={(!chairTypeId && repuestos.length === 0) || mutation.isPending}>
            {mutation.isPending ? 'Creando...' : 'Crear orden'}
          </Button>
        </div>
      </CardContent>
    </Card>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogHeader>
          <DialogTitle>¿Crear orden de trabajo?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          {chairTypeId
            ? `Se creará una orden por ${quantity} silla${(Number(quantity) !== 1 ? 's' : '')} ${tiposData?.data.find(t => t._id === chairTypeId)?.name}.`
            : 'Se creará una orden solo con repuestos.'}
          {adicionales.length > 0 && ` Incluye ${adicionales.length} adicional(es).`}
          {repuestos.length > 0 && ` Incluye ${repuestos.length} repuesto(s).`}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
          <Button onClick={() => { setShowConfirm(false); mutation.mutate() }}>Confirmar</Button>
        </div>
      </Dialog>
    </div>
  )
}
