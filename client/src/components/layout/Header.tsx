import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  onMenuClick: () => void
  title: string
}

export function Header({ onMenuClick, title }: HeaderProps) {
  return (
    <header className="flex items-center gap-3 h-14 border-b border-border px-4 bg-background">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="md:hidden">
        <Menu size={20} />
      </Button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  )
}
