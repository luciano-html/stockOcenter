import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import type { RankingResponse, TimelineResponse } from '@/types'
import { GoBack } from '@/components/shared/GoBack'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts'
import { Trophy, BarChart2, DollarSign, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import VentasGraficos from './VentasGraficos'
import PreciosCostosView from './PreciosCostosView'

export default function RankingSillas() {
  const [activeTab, setActiveTab] = useState<'produccion' | 'ventas' | 'costos'>('produccion')
  const [selectedChair, setSelectedChair] = useState<string | undefined>()
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState<string>('')

  const { data, isLoading } = useQuery<{ data: { ranking: RankingResponse[], timeline: TimelineResponse[] } }>({
    queryKey: ['stats-ranking', selectedYear, selectedMonth],
    queryFn: () => api.get('/ordenes-trabajo/stats/ranking', {
      params: { year: selectedYear, month: selectedMonth || undefined }
    }).then(r => r.data),
  })

  const ranking = data?.data.ranking ?? []
  const timeline = data?.data.timeline ?? []

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
        totalProducidas: found ? found.totalProducidas : 0,
        label: dateObj.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' })
      });
    }

    if (selectedMonth) {
       const m = parseInt(selectedMonth);
       return result.filter((_, idx) => idx >= m - 2 && idx <= m);
    }
    
    return result;
  }, [timeline, selectedYear, selectedMonth])

  const handleBarClick = (data: any) => {
    if (data && data._id) {
      setSelectedChair(data._id)
      setActiveTab('ventas')
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <GoBack to="/" />
      
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="text-primary h-6 w-6" /> Gráficos y estadísticas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Estadísticas de sillas fabricadas, ventas y análisis de costos.</p>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b hide-scrollbar">
        <button
          onClick={() => setActiveTab('produccion')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'produccion'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Trophy size={16} />
          <span>Ranking de Producción</span>
        </button>
        <button
          onClick={() => setActiveTab('ventas')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'ventas'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <DollarSign size={16} />
          <span>Ventas y Facturación</span>
        </button>
        <button
          onClick={() => setActiveTab('costos')}
          className={cn(
            'flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'costos'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Calculator size={16} />
          <span>Precios y Costos</span>
        </button>
      </div>

      {activeTab !== 'costos' && (
        <div className="flex justify-end items-center gap-3 pt-2">
          {activeTab === 'ventas' && (
            <div className="space-y-1">
              <Label className="text-xs">Silla específica</Label>
              <Select value={selectedChair || ''} onChange={(e) => setSelectedChair(e.target.value)}>
                <option value="">Todas las sillas</option>
                {ranking.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Mes (opcional)</Label>
            <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">Todo el año</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={String(i + 1)}>
                  {new Date(2020, i, 1).toLocaleDateString('es-AR', { month: 'long' })}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Año</Label>
            <Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {Array.from({ length: 10 }).map((_, i) => {
                const y = new Date().getFullYear() - 5 + i;
                return <option key={y} value={y}>{y}</option>;
              })}
            </Select>
          </div>
        </div>
      )}

      {activeTab === 'costos' ? (
        <PreciosCostosView />
      ) : activeTab === 'ventas' ? (
        <VentasGraficos 
          selectedYear={selectedYear} 
 
          selectedMonth={selectedMonth} 
          chairTypeId={selectedChair} 
        />
      ) : (
        <>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy size={18} className="text-primary" /> Línea Histórica de Producción
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Evolución en el tiempo de las sillas fabricadas (en la vista actual).</p>
                </CardHeader>
                <CardContent>
                    {formattedTimeline.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorProducidas" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis 
                            dataKey="label" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                            dy={10} 
                          />
                          <YAxis 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                            allowDecimals={false}
                          />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-3 shadow-md">
                                    <p className="mb-1 font-medium text-foreground">{label}</p>
                                    {payload.map((entry: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                                        <span className="font-semibold text-primary">
                                          {entry.name}: {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            }}
                            cursor={{ stroke: 'hsl(var(--muted))', strokeWidth: 1, strokeDasharray: '4 4' }}
                          />
                          <Area type="linear" dataKey="totalProducidas" name="Sillas Producidas" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorProducidas)" dot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--background))", stroke: "hsl(var(--primary))" }} activeDot={{ r: 6, fill: "hsl(var(--primary))", stroke: "hsl(var(--background))", strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No hay datos para este período.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="flex flex-col shadow-sm border-muted/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 font-semibold">
                      <Trophy size={18} className="text-amber-500" /> Top Sillas Fabricadas
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Las sillas con mayor volumen de producción.</p>
                  </CardHeader>
                  <CardContent className="h-[350px] flex-1 pt-4">
                    {ranking.length > 0 ? (
                      <ResponsiveContainer width="100%" height={330}>
                        <BarChart data={ranking} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={24}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
                          <XAxis 
                            type="number" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                            allowDecimals={false}
                          />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 500 }} 
                            width={140}
                          />
                          <Tooltip 
                            cursor={{ fill: 'hsl(var(--muted)/0.3)' }}
                            content={({ active, payload, label }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="rounded-lg border bg-background p-3 shadow-md">
                                    <p className="mb-1 font-medium text-foreground">{label}</p>
                                    {payload.map((entry: any, index: number) => (
                                      <div key={index} className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <span className="font-semibold text-primary">
                                          {entry.name}: {entry.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              }
                              return null
                            }}
                          />
                          <Bar 
                            dataKey="totalProducidas" 
                            name="Sillas Producidas" 
                            fill="hsl(var(--foreground))" 
                            radius={[0, 4, 4, 0]} 
                            opacity={0.9} 
                            onClick={handleBarClick}
                            cursor="pointer"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No hay datos para este período.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}
