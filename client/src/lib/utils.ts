import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function qtyWithUnit(qty: number | string | null | undefined, unit?: string | null): string {
  if (qty === undefined || qty === null || qty === '') return ''
  const u = unit?.trim() ?? ''
  const numericOnly = u !== '' && /^[0-9.,]+$/.test(u)
  return `${qty}${u && !numericOnly ? ` ${u}` : ''}`
}
