import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { updateContractor } from '../api'

function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('updateContractor', () => {
  it('posts to /rpc/update_contractor with correct params', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true }))
    await updateContractor('ctr-1', {
      full_name: 'Иванов',
      contractor_type: 'individual',
      phone: null,
      email: null,
    })
    expect(mockFetch.mock.calls[0][0]).toContain('/rpc/update_contractor')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_contractor_id).toBe('ctr-1')
    expect(body.p_org_id).toBe('org-123')
    expect(body.p_full_name).toBe('Иванов')
    expect(body.p_contractor_type).toBe('individual')
    expect(body.p_phone).toBeNull()
    expect(body.p_email).toBeNull()
  })

  it('throws when RPC returns ok: false', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'NOT_FOUND' }))
    await expect(
      updateContractor('ctr-1', {
        full_name: 'A',
        contractor_type: 'legal_entity',
        phone: '+1',
        email: 'a@b.c',
      })
    ).rejects.toThrow('NOT_FOUND')
  })
})
