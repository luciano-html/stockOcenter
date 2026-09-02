import { useState } from 'react'
import { ColaReparto } from './ColaReparto'
import { HojasRuta } from './HojasRuta'
import { GoBack } from '@/components/shared/GoBack'
import { Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RepartoView() {
  const [activeTab, setActiveTab] = useState<'cola' | 'rutas'>('cola')

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <GoBack to="/" />
        <div className="flex items-center text-2xl font-bold">
          <Truck className="w-8 h-8 mr-3 text-blue-600" />
          Gestión de Reparto
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={cn(
            "px-6 py-3 font-medium text-sm transition-colors border-b-2",
            activeTab === 'cola' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
          onClick={() => setActiveTab('cola')}
        >
          Cola de Reparto
        </button>
        <button
          className={cn(
            "px-6 py-3 font-medium text-sm transition-colors border-b-2",
            activeTab === 'rutas' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
          onClick={() => setActiveTab('rutas')}
        >
          Hojas de Ruta
        </button>
      </div>

      {activeTab === 'cola' ? <ColaReparto /> : <HojasRuta />}
    </div>
  )
}
