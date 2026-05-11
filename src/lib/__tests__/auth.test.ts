import { describe, it, expect, beforeEach } from 'vitest'
import { saveAuth, getToken, getOrgId, getName, getRole, isAuthenticated, logout } from '../auth'

beforeEach(() => {
  localStorage.clear()
})

describe('auth', () => {
  it('isAuthenticated false when no token', () => {
    expect(isAuthenticated()).toBe(false)
  })

  it('saveAuth stores values, isAuthenticated returns true', () => {
    saveAuth({ token: 'tok', organization_id: 'org1', user_role: 'treasurer', full_name: 'Иванов' })
    expect(isAuthenticated()).toBe(true)
    expect(getToken()).toBe('tok')
    expect(getOrgId()).toBe('org1')
    expect(getRole()).toBe('treasurer')
    expect(getName()).toBe('Иванов')
  })

  it('logout clears all values', () => {
    saveAuth({ token: 'tok', organization_id: 'org1', user_role: 'treasurer' })
    logout()
    expect(isAuthenticated()).toBe(false)
    expect(getToken()).toBeNull()
    expect(getOrgId()).toBeNull()
  })
})
