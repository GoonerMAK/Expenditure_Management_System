import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatAmount = (amount: number) =>
  amount.toLocaleString('en-US', { maximumFractionDigits: 2 })

export const formatDate = (date: string | Date | undefined | null) =>
  date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not specified'

export const formatMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

export const toOptionalAmount =(value: number | string | null | undefined) =>
  value === '' || value === null || value === undefined ? null : parseFloat(value.toString())

export const formatPercent = (percent: number | null) =>
  percent === null ? 'N/A' : `${percent}%`

export const getServerMessage = (error: unknown): string | undefined => {
  const err = error as { response?: { data?: { message?: string } }; data?: { message?: string } } | null
  return err?.response?.data?.message ?? err?.data?.message
}
