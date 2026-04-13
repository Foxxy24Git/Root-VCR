import { prisma } from "@/lib/prisma"

async function monthlyReset() {
  const now = new Date()

  if (now.getDate() !== 1) {
    console.log("Not the 1st of the month, skipping reset.")
    return
  }

  console.log(`Starting monthly reset at ${now.toISOString()}`)

  // TODO: Archive monthly data and reset dashboard stats
  // Wallet balances are NOT reset - only display stats

  console.log(`Monthly reset completed at ${now.toISOString()}`)
}

monthlyReset()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
