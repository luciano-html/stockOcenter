import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import api from '@/services/api'
import type { StockMovement, ChairType } from '@/types'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Search, ArrowRight } from 'lucide-react'
import StockMovementsTable from '@/components/movements/StockMovementsTable'

interface BomItemDetail {
  componentId: { _id: string; name: string; unit: string; tipo: string; subtipo?: string; marca?: string }
  quantity: number
  stockActual: number
  stockReservado: number
  stockDisponible: number
}

interface BomDetalleData {
  chairType: { _id: string; name: string }
  sillasPosibles: number
  limitante: { componentId: string; name: string; stockDisponible: number; necesario: number } | null
  items: BomItemDetail[]
}

export default function Dashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { isLoading } = useQuery({
    queryKey: ['stock-resumen'],
    queryFn: () => api.get('/stock/resumen').then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const { data: movData } = useQuery<{ data: StockMovement[] }>({
    queryKey: ['movimientos-recent'],
    queryFn: () => api.get('/stock/movimientos', { params: { limit: 15 } }).then((r) => r.data),
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const { data: tiposData } = useQuery<{ data: ChairType[] }>({
    queryKey: ['tipos-silla-search'],
    queryFn: () => api.get('/tipos-silla').then((r) => r.data),
  })

  const { data: bomDetalle, isLoading: bomLoading } = useQuery<{ data: BomDetalleData }>({
    queryKey: ['bom-detalle', selectedId],
    queryFn: () => api.get(`/tipos-silla/${selectedId}/bom-detalle`).then((r) => r.data),
    enabled: !!selectedId,
  })

  const tiposFiltrados = useMemo(
    () => tiposData?.data.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) ?? [],
    [tiposData, search]
  )

  if (isLoading) return <Skeleton className="h-96" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        {isAdmin && (
          <Link to="/tipos-silla/nuevo" className="block">
            <Card className="cursor-pointer w-fit min-w-[180px]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Crear silla</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-green-600">+ Nueva</p></CardContent>
            </Card>
          </Link>
        )}
        {isAdmin && (
          <Link to="/componentes/nuevo" className="block">
            <Card className="cursor-pointer w-fit min-w-[180px]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Crear componente</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-blue-600">+ Nuevo</p></CardContent>
            </Card>
          </Link>
        )}
        {isAdmin && (
          <Link to="/ordenes-trabajo/nuevo" className="block">
            <Card className="cursor-pointer w-fit min-w-[180px]">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nueva orden</CardTitle></CardHeader>
              <CardContent><p className="text-lg font-bold text-amber-600">+ Nueva</p></CardContent>
            </Card>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sillas posibles por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input placeholder="Buscar tipo de silla..." className="pl-9"
                value={search} onChange={(e) => { setSearch(e.target.value); setSelectedId(null) }} />
            </div>

            {!selectedId ? (
              <div className="max-h-[260px] overflow-y-auto space-y-1">
                {tiposFiltrados.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                )}
                {tiposFiltrados.map((t) => (
                  <button key={t._id}
                    onClick={() => setSelectedId(t._id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors flex justify-between items-center">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground text-xs">Ver detalle →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedId(null)} className="text-sm text-muted-foreground hover:text-foreground">
                    ← Volver
                  </button>
                  {bomDetalle?.data && (
                    <span className="text-lg font-bold">
                      {bomDetalle.data.sillasPosibles} silla{bomDetalle.data.sillasPosibles !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {bomLoading ? <Skeleton className="h-40" /> : bomDetalle?.data.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin BOM definido</p>
                ) : (
                  <div className="max-h-[260px] overflow-y-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Componente</TableHead>
                          <TableHead>Necesario</TableHead>
                          <TableHead>Disponible</TableHead>
                          <TableHead>Sillas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bomDetalle?.data.items.map((item, idx) => {
                          const sillas = Math.floor(item.stockDisponible / item.quantity)
                          return (
                            <TableRow key={idx} className={item.stockDisponible < item.quantity ? 'bg-red-50' : ''}>
                              <TableCell className="font-medium">{item.componentId.name}</TableCell>
                              <TableCell>{item.quantity} {item.componentId.unit}</TableCell>
                              <TableCell className={item.stockDisponible < item.quantity ? 'text-destructive font-bold' : ''}>
                                {item.stockDisponible} {item.componentId.unit}
                              </TableCell>
                              <TableCell className={sillas < bomDetalle.data.sillasPosibles ? 'text-destructive font-bold' : ''}>
                                {sillas}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {bomDetalle?.data.limitante && (
                  <p className="text-xs text-muted-foreground">
                    Limitante: <span className="font-medium">{bomDetalle.data.limitante.name}</span>
                    {' — '}disp. {bomDetalle.data.limitante.stockDisponible}, necesita {bomDetalle.data.limitante.necesario} c/u
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Últimos movimientos</CardTitle>
            <Link to="/ingreso-stock" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              Ver todo <ArrowRight size={14} />
            </Link>
          </CardHeader>
          <CardContent>
            <StockMovementsTable
              movements={movData?.data ?? []}
              compact
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
