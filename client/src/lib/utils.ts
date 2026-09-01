import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function qtyWithUnit(qty: number | string | null | undefined, _unit?: string | null): string {
  if (qty === undefined || qty === null || qty === '') return ''
  return `${qty}`
}
