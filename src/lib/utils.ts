import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a voucher code with the given prefix, length, and character format.
 */
export function generateVoucherCode(
  prefix: string,
  length: number,
  format: "alphanumeric_upper" | "alphanumeric_lower" | "alphanumeric_mixed" | "numeric" | "alpha"
): string {
  let chars: string
  switch (format) {
    case "numeric":
      chars = "0123456789"
      break
    case "alpha":
      chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
      break
    case "alphanumeric_lower":
      chars = "abcdefghijklmnopqrstuvwxyz0123456789"
      break
    case "alphanumeric_mixed":
      chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      break
    case "alphanumeric_upper":
    default:
      chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
      break
  }

  let code = ""
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `${prefix}${code}`
}

/**
 * Calculate reseller price given the base price and fee percentage (discount).
 * Example: basePrice=10000, feePercentage=15 → resellerPrice=8500
 */
export function calculateResellerPrice(
  basePrice: number,
  feePercentage: number
): { resellerPrice: number; feeAmount: number } {
  const feeAmount = Math.round(basePrice * (feePercentage / 100))
  const resellerPrice = basePrice - feeAmount
  return { resellerPrice, feeAmount }
}
