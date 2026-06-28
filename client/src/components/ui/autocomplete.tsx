import { useState, useRef, useEffect, useMemo, useId, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface AutocompleteOption {
  value: string
  label: string
}

interface AutocompleteProps {
  options: AutocompleteOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  label,
  disabled,
  className,
  id,
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevValueRef = useRef(value)
  const fallbackId = useId()
  const inputId = id ?? fallbackId

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value]
  )

  // Sincroniza el input solo cuando cambia la seleccion externa (value),
  // no en cada render, para no pisar lo que el usuario esta escribiendo.
  useEffect(() => {
    if (prevValueRef.current !== value) {
      setInputValue(selectedLabel)
      prevValueRef.current = value
    }
  }, [value, selectedLabel])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setInputValue(selectedLabel)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedLabel])

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return options.slice(0, 50)
    return options
      .filter((o) => o.label.toLowerCase().includes(query))
      .slice(0, 50)
  }, [options, inputValue])

  // Resetea el highlight cuando cambian las opciones filtradas.
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions.length])

  const handleSelect = useCallback((option: AutocompleteOption) => {
    onChange(option.value)
    setInputValue(option.label)
    setOpen(false)
    inputRef.current?.blur()
  }, [onChange])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setOpen(true)
    if (newValue === '') {
      onChange('')
    }
  }, [onChange])

  const handleFocus = useCallback(() => {
    setOpen(true)
    // Selecciona todo el texto para que al empezar a escribir se reemplace.
    inputRef.current?.select()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setOpen(true)
      }
      return
    }

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
          handleSelect(filteredOptions[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setInputValue(selectedLabel)
        inputRef.current?.blur()
        break
      case 'Tab':
        setOpen(false)
        setInputValue(selectedLabel)
        break
    }
  }, [open, filteredOptions, highlightedIndex, handleSelect, selectedLabel])

  const showNoResults = open && inputValue.trim() !== '' && filteredOptions.length === 0
  const showList = open && filteredOptions.length > 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        value={inputValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={showList ? `${inputId}-listbox` : undefined}
        aria-activedescendant={showList ? `${inputId}-option-${highlightedIndex}` : undefined}
        role="combobox"
      />
      {showList && (
        <ul
          id={`${inputId}-listbox`}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background py-1 shadow-lg"
          role="listbox"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${inputId}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm hover:bg-muted',
                option.value === value && 'bg-muted font-medium',
                index === highlightedIndex && 'bg-accent'
              )}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
      {showNoResults && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-background py-2 px-3 text-sm text-muted-foreground shadow-lg">
          Sin resultados
        </div>
      )}
    </div>
  )
}
