import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export function GoBack({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <Button variant="ghost" size="icon" onClick={() => navigate(to)} className="mb-2">
      <ArrowLeft size={20} />
    </Button>
  )
}