import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAmount = (amount: number) =>
  amount.toLocaleString('en-US', { maximumFractionDigits: 2 })

export const formatPercent = (percent: number | null) =>
  percent === null ? 'N/A' : `${percent}%`
