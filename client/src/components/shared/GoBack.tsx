import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function GoBack() {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mb-2">
      <ArrowLeft size={20} />
    </Button>
  )
}
