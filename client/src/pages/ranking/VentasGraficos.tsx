import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '@/services/api'
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TrendingUp, Clock, Eye, ScrollText, Store, Building2 } from 'lucide-react'

interface TimelineEntry {
  date: string
  ventas: number
  aCobrar: number
}

interface SillaDetailEntry {
  name: string
  quantity: number
  precioVenta?: number
  costoPiezas?: number
  costoUnitario?: number
  gananciaUnitaria?: number
  subtotalVenta?: number
  subtotalCosto?: number
  subtotalGanancia?: number
  price: number
  subtotal: number
}

interface HistoryEntry {
  _id: string
  orderNumber: string
  status: string
  origen: string
  date: string
  sillasDesc: string
  sillasDetail: SillaDetailEntry[]
  totalVenta?: number
  totalCosto?: number
  totalGanancia?: number
  total: number
}

interface VentasGraficosProps {
  selectedYear: string
  selectedMonth: string
  chairTypeId?: string
}

export default function VentasGraficos({ selectedYear, selectedMonth, chairTypeId }: VentasGraficosProps) {
  const [selectedOrder, setSelectedOrder] = useState<HistoryEntry | null>(null)
  const [showPending, setShowPending] = useState(false)
  
  const { data, isLoading } = useQuery<{ data: { timeline: TimelineEntry[], history: HistoryEntry[] } }>({
    queryKey: ['stats-ventas', selectedYear, selectedMonth, chairTypeId],
    queryFn: () => api.get('/ordenes-trabajo/stats/ventas', {
      params: { year: selectedYear, month: selectedMonth || undefined, chairTypeId: chairTypeId || undefined }
    }).then(r => r.data),
  })


  const timeline = data?.data.timeline ?? []
  const history = data?.data.history ?? []
  const pendingOrders = history.filter(o => o.status === 'pendiente' || o.status === 'en_progreso')

  const formattedTimeline = useMemo(() => {
    if (!selectedYear) return [];
    
    const yearNum = parseInt(selectedYear);
    const result = [];
    
    for (let i = 1; i <= 12; i++) {
      const dateStr = `${yearNum}-${String(i).padStart(2, '0')}`;
      const found = timeline.find(t => t.date === dateStr);
      const dateObj = new Date(yearNum, i - 1, 1);
      
      result.push({
        date: dateStr,
        ventas: found ? found.ventas : 0,
        aCobrar: found ? found.aCobrar : 0,
        label: dateObj.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
      });
    }

    if (selectedMonth) {
       const m = parseInt(selectedMonth);
       return result.filter((_, idx) => idx >= m - 2 && idx <= m);
    }
    
    return result;
  }, [timeline, selectedYear, selectedMonth])

  const { totalVentas, totalACobrar } = useMemo(() => {
    return timeline.reduce(
      (acc, curr) => ({
        totalVentas: acc.totalVentas + curr.ventas,
        totalACobrar: acc.totalACobrar + curr.aCobrar,
      }),
      { totalVentas: 0, totalACobrar: 0 }
    )
  }, [timeline])

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-[400px]" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Ganancia Neta (Finalizadas)</p>
              <h3 className="text-2xl font-bold text-green-900">
                ${totalVentas.toLocaleString('es-AR')}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">Ganancia Proyectada (Pendientes)</p>
                <h3 className="text-2xl font-bold text-amber-900">
                  ${totalACobrar.toLocaleString('es-AR')}
                </h3>
              </div>
            </div>
            <button 
              onClick={() => setShowPending(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-md transition-colors"
            >
              <ScrollText size={16} /> Ver órdenes
            </button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="text-primary h-5 w-5" /> Evolución de Ganancias Netas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedTimeline} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorACobrar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background p-3 rounded-lg border shadow-md">
                          <p className="font-bold mb-2">{label}</p>
                          <p className="text-green-600 font-medium">Ganancia Neta: ${payload[0]?.value?.toLocaleString('es-AR')}</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area 
                  type="linear" 
                  dataKey="ventas" 
                  stroke="#16a34a" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVentas)" 
                  activeDot={{ r: 6, fill: '#16a34a', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="text-primary h-5 w-5" /> Historial de Órdenes Relacionadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">No hay órdenes de trabajo vinculadas en este período.</p>
          ) : (
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 text-xs">
                  <TableRow>
                    <TableHead>ID Orden</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sillas (BOM)</TableHead>
                    <TableHead className="text-right">Venta Total</TableHead>
                    <TableHead className="text-right">Costo Total</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {history.map(item => (
                    <TableRow key={item._id} className="hover:bg-muted/20">
                      <TableCell className="font-medium text-blue-600 hover:underline">
                        <Link to={`/ordenes-trabajo/${item._id}`}>{item.orderNumber}</Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {item.origen === 'Tienda' ? (
                            <><Store size={13} className="text-blue-600" /><span className="text-blue-700">Tienda</span></>
                          ) : (
                            <><Building2 size={13} className="text-orange-600" /><span className="text-orange-700">Negocio</span></>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={item.sillasDesc}>
                        {item.sillasDesc || 'Sin sillas especificadas'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        ${(item.totalVenta ?? 0).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-700">
                        ${(item.totalCosto ?? 0).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-700">
                        ${(item.totalGanancia ?? item.total ?? 0).toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <button onClick={() => setSelectedOrder(item)} className="inline-flex items-center justify-center p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer" title="Ver desglose detallado">
                          <Eye size={16} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DETALLE DE SILLAS Y COSTOS */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Detalle de sillas y costos - Orden #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted text-xs">
                  <TableRow>
                    <TableHead>Silla / Modelo</TableHead>
                    <TableHead className="text-center">Cant.</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right">Costo Fab.</TableHead>
                    <TableHead className="text-right">Ganancia Unit.</TableHead>
                    <TableHead className="text-right">Subtotal Ganancia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {selectedOrder?.sillasDetail?.map((s, idx) => {
                    const pVenta = s.precioVenta ?? (s.price + (s.costoUnitario ?? 0))
                    const cFab = s.costoUnitario ?? (pVenta > s.price ? pVenta - s.price : 0)
                    const gUnit = s.gananciaUnitaria ?? s.price
                    const subGanancia = s.subtotalGanancia ?? s.subtotal

                    return (
                      <TableRow key={idx} className="hover:bg-muted/20">
                        <TableCell className="font-semibold">{s.name}</TableCell>
                        <TableCell className="text-center font-bold">{s.quantity}</TableCell>
                        <TableCell className="text-right font-medium text-foreground">
                          ${pVenta.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-700">
                          ${cFab.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          ${gUnit.toLocaleString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-800">
                          ${subGanancia.toLocaleString('es-AR')}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Tarjetas de Resumen Financiero de la Orden */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 text-center">
                <span className="text-[11px] text-blue-900 block font-medium">Facturación Venta</span>
                <span className="text-base font-bold text-blue-950">
                  ${(selectedOrder?.totalVenta ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-center">
                <span className="text-[11px] text-amber-900 block font-medium">Costo Total Fábrica</span>
                <span className="text-base font-bold text-amber-950">
                  ${(selectedOrder?.totalCosto ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="bg-green-50/70 p-3 rounded-lg border border-green-200 text-center">
                <span className="text-[11px] text-green-900 block font-medium">Ganancia Neta</span>
                <span className="text-base font-bold text-green-800">
                  ${(selectedOrder?.totalGanancia ?? selectedOrder?.total ?? 0).toLocaleString('es-AR')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Dialog>


      <Dialog open={showPending} onOpenChange={setShowPending}>
        <div className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Órdenes Pendientes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border rounded-md max-h-[400px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    <TableHead>ID Orden</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ganancia Proyectada</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map(item => (
                    <TableRow key={item._id}>
                      <TableCell className="font-medium text-blue-600 hover:underline">
                        <Link to={`/ordenes-trabajo/${item._id}`}>{item.orderNumber}</Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          {item.origen === 'Tienda' ? (
                            <><Store size={14} className="text-blue-600" /><span className="text-blue-700">Tienda</span></>
                          ) : (
                            <><Building2 size={14} className="text-orange-600" /><span className="text-orange-700">Negocio</span></>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(item.date).toLocaleDateString('es-AR')}</TableCell>
                      <TableCell className="text-right font-medium text-amber-700">
                        ${item.total.toLocaleString('es-AR')}
                      </TableCell>
                      <TableCell>
                        <button onClick={() => { setShowPending(false); setSelectedOrder(item); }} className="inline-flex items-center justify-center p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                          <Eye size={18} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center bg-amber-50 p-3 rounded-md border border-amber-200">
              <span className="font-medium text-amber-900">Total Proyectado:</span>
              <span className="font-bold text-amber-700 text-lg">${totalACobrar.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
