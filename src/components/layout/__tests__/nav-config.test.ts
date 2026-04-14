import { describe, it, expect } from 'vitest'
import { ADMIN_NAV, RESELLER_NAV } from '../nav-config'

describe('ADMIN_NAV', () => {
  it('has exactly 7 items', () => {
    expect(ADMIN_NAV).toHaveLength(7)
  })

  it('has labels in order: Dashboard, Vouchers, Resellers, Wallet, Analytics, VCR Config, Settings', () => {
    const labels = ADMIN_NAV.map((i) => i.label)
    expect(labels).toEqual(['Dashboard', 'Vouchers', 'Resellers', 'Wallet', 'Analytics', 'VCR Config', 'Settings'])
  })

  it('all hrefs start with /admin/', () => {
    ADMIN_NAV.forEach((item) => {
      expect(item.href).toMatch(/^\/admin\//)
    })
  })

  it('all items have a valid icon component', () => {
    ADMIN_NAV.forEach((item) => {
      expect(item.icon).toBeDefined()
      expect(item.icon).not.toBeNull()
    })
  })
})

describe('RESELLER_NAV', () => {
  it('has exactly 4 items', () => {
    expect(RESELLER_NAV).toHaveLength(4)
  })

  it('has labels in order: Dashboard, Vouchers, Analytics, Settings', () => {
    const labels = RESELLER_NAV.map((i) => i.label)
    expect(labels).toEqual(['Dashboard', 'Vouchers', 'Analytics', 'Settings'])
  })

  it('all hrefs start with /reseller/', () => {
    RESELLER_NAV.forEach((item) => {
      expect(item.href).toMatch(/^\/reseller\//)
    })
  })

  it('all items have a valid icon component', () => {
    RESELLER_NAV.forEach((item) => {
      expect(item.icon).toBeDefined()
      expect(item.icon).not.toBeNull()
    })
  })
})
