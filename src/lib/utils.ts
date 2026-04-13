import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function generateVoucherCode(
  prefix: string,
  length: number,
  format: "alphanumeric_upper" | "alphanumeric_lower" | "alphanumeric_mixed" | "numeric" | "alpha"
): string {
  const chars: Record<typeof format, string> = {
    alphanumeric_upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    alphanumeric_lower: "abcdefghijklmnopqrstuvwxyz0123456789",
    alphanumeric_mixed: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    numeric: "0123456789",
    alpha: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  }

  const charset = chars[format]
  let code = ""
  for (let i = 0; i < length; i++) {
    code += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return `${prefix}${code}`
}

export function calculateResellerPrice(basePrice: number, feePercentage: number) {
  const discount = basePrice * (feePercentage / 100)
  const resellerPrice = basePrice - discount
  return {
    basePrice,
    discount,
    resellerPrice,
    adminProfit: basePrice,
  }
}
