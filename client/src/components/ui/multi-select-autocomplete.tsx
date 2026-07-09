import { useState, useRef, useEffect, useMemo, useId, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface MultiSelectAutocompleteProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  label?: string
}

export function MultiSelectAutocomplete({
  options,
  selected,
  onChange,
  placeholder = 'Buscar componentes...',
  label,
}: MultiSelectAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fallbackId = useId()
  const inputId = fallbackId

  const selectedSet = useMemo(() => new Set(selected), [selected])

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return options.slice(0, 50)
    return options
      .filter((o) => o.label.toLowerCase().includes(query))
      .slice(0, 50)
  }, [options, inputValue])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = useCallback((value: string) => {
    onChange(
      selectedSet.has(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    )
  }, [selected, selectedSet, onChange])

  const removeOption = useCallback((value: string) => {
    onChange(selected.filter((v) => v !== value))
  }, [selected, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          toggleOption(filteredOptions[highlightedIndex].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        inputRef.current?.blur()
        break
    }
  }, [open, filteredOptions, highlightedIndex, toggleOption])

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedSet.has(o.value)),
    [options, selectedSet]
  )

  return (
    <div ref={containerRef} className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={inputValue}
          placeholder={placeholder}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          )}
        />
        {open && filteredOptions.length > 0 && (
          <ul className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background py-1 shadow-lg">
            {filteredOptions.map((option, index) => {
              const isSelected = selectedSet.has(option.value)
              return (
                <li
                  key={option.value}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => toggleOption(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-muted',
                    index === highlightedIndex && 'bg-accent',
                    isSelected && 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      isSelected ? 'bg-primary border-primary' : 'border-input'
                    )}
                  >
                    {isSelected && <Check size={12} className="text-primary-foreground" />}
                  </span>
                  <span className="flex-1 truncate">{option.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((o) => (
            <span
              key={o.value}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium"
            >
              {o.label.split(' — ')[0]}
              <button
                type="button"
                onClick={() => removeOption(o.value)}
                className="rounded-full p-0.5 hover:bg-background"
                aria-label={`Quitar ${o.label}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
