import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/services/api'
import type { AxiosErrorType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { AlertTriangle, CheckCircle, Package } from 'lucide-react'

interface Item {
  componentId: { _id: string; name: string; unit: string; tipo?: string; subtipo?: string; marca?: string }
  quantity: number
  unit: string
  tipo: 'bom' | 'adicional' | 'repuesto'
}

interface Props {
  orderId: string
  items: Item[]
  isOpen: boolean
  onClose: () => void
}

export default function FinalizarOrdenModal({ orderId, items, isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [cantidades, setCantidades] = useState<number[]>(() => items.map((i) => i.quantity))
  const [notas, setNotas] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/ordenes-trabajo/${orderId}/finalizar`, {
        cantidades,
        notas: notas.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo', orderId] })
      queryClient.invalidateQueries({ queryKey: ['orden-trabajo-detalle', orderId] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo'] })
      queryClient.invalidateQueries({ queryKey: ['stock-resumen'] })
      queryClient.invalidateQueries({ queryKey: ['ordenes-trabajo-dash'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos-recent'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos'] })
      handleClose()
    },
    onError: (err: AxiosErrorType) => {
      setErrorMsg(err?.response?.data?.error?.message ?? 'Error al finalizar la orden')
    },
  })

  function handleClose() {
    setStep(1)
    setCantidades(items.map((i) => i.quantity))
    setNotas('')
    setErrorMsg('')
    onClose()
  }

  function handleNextFromStep1() {
    setErrorMsg('')
    for (let i = 0; i < items.length; i++) {
      const prepared = Number(cantidades[i])
      if (Number.isNaN(prepared)) {
        setErrorMsg(`La cantidad del ítem ${i + 1} no es válida`)
        return
      }
      if (prepared < items[i].quantity) {
        setErrorMsg(`La cantidad preparada del ítem ${i + 1} es menor a la requerida. Avise al administrador para editar la orden.`)
        return
      }
      if (prepared > items[i].quantity) {
        setErrorMsg(`La cantidad preparada del ítem ${i + 1} no puede superar la requerida`)
        return
      }
    }
    setStep(2)
  }

  function getItemLabel(item: Item) {
    if (item.tipo === 'bom') return `${item.componentId.name} (silla)`
    if (item.tipo === 'adicional') return `${item.componentId.name} (adicional)`
    return `${item.componentId.name} (repuesto)`
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogHeader>
        <DialogTitle>
          {step === 1 && 'Paso 1 de 3: Verificar cantidades preparadas'}
          {step === 2 && 'Paso 2 de 3: Confirmar egreso de componentes'}
          {step === 3 && 'Paso 3 de 3: Confirmar finalización'}
        </DialogTitle>
      </DialogHeader>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Confirmá que preparaste la cantidad exacta de cada ítem. Si falta algo, no podés finalizar la orden.
          </p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ítem</TableHead>
                  <TableHead>Cantidad requerida</TableHead>
                  <TableHead>Cantidad preparada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{getItemLabel(item)}</TableCell>
                    <TableCell>{item.quantity} {item.unit || item.componentId.unit}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={cantidades[idx]}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '')
                          setCantidades((prev) => prev.map((c, i) => (i === idx ? (value === '' ? 0 : Number(value)) : c)))
                        }}
                        className="w-24"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {errorMsg && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleNextFromStep1}>Siguiente</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Al finalizar se descontarán los siguientes componentes del stock:
          </p>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Componente</TableHead>
                  <TableHead>Cantidad a egresar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <Package size={16} className="text-muted-foreground" />
                      {getItemLabel(item)}
                    </TableCell>
                    <TableCell>{item.quantity} {item.unit || item.componentId.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Volver</Button>
            <Button onClick={() => setStep(3)}>Confirmar egreso</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-muted p-3 rounded-md">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Resumen</p>
              <p className="text-muted-foreground">{items.length} ítem(s) verificados correctamente.</p>
              <p className="text-muted-foreground">El stock será descontado al confirmar.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas / novedades (opcional)</Label>
            <Input
              id="notas"
              placeholder="ej. Se entregó completo, faltó un tornillo..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
          {errorMsg && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>Volver</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? 'Finalizando...' : 'Confirmar finalización'}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  )
}
