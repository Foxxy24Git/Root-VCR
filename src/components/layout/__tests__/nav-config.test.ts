import { describe, it, expect } from 'vitest'
import { ADMIN_NAV, RESELLER_NAV } from '../nav-config'

describe('ADMIN_NAV', () => {
  it('has exactly 6 items', () => {
    expect(ADMIN_NAV).toHaveLength(6)
  })

  it('has labels in order: Dashboard, Vouchers, Resellers, Wallet, Analytics, Settings', () => {
    const labels = ADMIN_NAV.map((i) => i.label)
    expect(labels).toEqual(['Dashboard', 'Vouchers', 'Resellers', 'Wallet', 'Analytics', 'Settings'])
  })

  it('all hrefs start with /admin/', () => {
    ADMIN_NAV.forEach((item) => {
      expect(item.href).toMatch(/^\/admin\//)
    })
  })

  it('all items have an icon function', () => {
    ADMIN_NAV.forEach((item) => {
      expect(typeof item.icon).toBe('function')
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

  it('all items have an icon function', () => {
    RESELLER_NAV.forEach((item) => {
      expect(typeof item.icon).toBe('function')
    })
  })
})
