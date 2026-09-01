import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import api from '@/services/api'
import type { StockTransaction, Pagination, Componente } from '@/types'
import { History } from 'lucide-react'
import { GoBack } from '@/components/shared/GoBack'
import StockMovementsTable from '@/components/movements/StockMovementsTable'

export default function MovimientosList() {
  const [params, setParams] = useSearchParams()
  const componenteId = params.get('componenteId') ?? ''
  const tipo = params.get('tipo') ?? ''
  const page = Number(params.get('page') ?? '1')

  const filters: Record<string, string | number> = { page }
  if (componenteId) filters.componenteId = componenteId
  if (tipo) filters.tipo = tipo

  const { data: compData } = useQuery<{ data: Componente[] }>({
    queryKey: ['componentes-filter'],
    queryFn: () => api.get('/componentes', { params: { limit: 1000 } }).then((r) => r.data),
  })

  const { data: movData, isLoading } = useQuery<{ data: StockTransaction[]; pagination: Pagination }>({
    queryKey: ['movimientos', filters],
    queryFn: () => api.get('/stock/movimientos', { params: filters }).then((r) => r.data),
  })

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    value ? next.set(key, value) : next.delete(key)
    next.set('page', '1')
    setParams(next, { replace: true })
  }

  function buscar() {
    const next = new URLSearchParams(params)
    next.set('page', '1')
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-4">
      <GoBack to="/" />
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History size={24} />
          Historial de movimientos
        </h1>
      </div>

      <StockMovementsTable
        movements={movData?.data ?? []}
        loading={isLoading}
        showNotes
        showAuthor
        showFilters
        showPagination
        componentOptions={compData?.data}
        filterComponentId={componenteId}
        filterType={tipo}
        pagination={movData?.pagination}
        page={page}
        onFilterComponentChange={(val) => updateParam('componenteId', val)}
        onFilterTypeChange={(val) => updateParam('tipo', val)}
        onSearch={buscar}
        onPageChange={(p) => {
          const next = new URLSearchParams(params)
          next.set('page', String(p))
          setParams(next, { replace: true })
        }}
      />
    </div>
  )
}
