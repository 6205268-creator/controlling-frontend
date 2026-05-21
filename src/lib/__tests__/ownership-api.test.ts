import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { searchContractors, createContractor, createOwnership, postOwnership } from '../api'

function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('searchContractors', () => {
  it('posts to /rpc/search_contractors and returns array', async () => {
    const rows = [{ id: 'c-1', full_name: 'Иванов', contractor_type: 'individual', phone: null }]
    mockFetch.mockResolvedValueOnce(okJson(rows))
    const result = await searchContractors('org-1', 'Иванов')
    expect(result).toEqual(rows)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/rpc/search_contractors'),
      expect.objectContaining({ method: 'POST' })
    )
  })
})

describe('createContractor', () => {
  it('returns ok:true with contractor_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, contractor_id: 'c-new' }))
    const result = await createContractor({
      orgId: 'org-1', fullName: 'Петров', contractorType: 'individual', phone: '+7 900 000 00 01',
    })
    expect(result.ok).toBe(true)
    expect(result.contractor_id).toBe('c-new')
  })
})

describe('createOwnership', () => {
  it('returns ok:true with doc_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-1', status: 'draft' }))
    const result = await createOwnership({
      orgId: 'org-1', objectType: 'plot',
      objectId: 'plot-1', docDate: '2026-05-12',
    })
    expect(result.ok).toBe(true)
    expect(result.doc_id).toBe('doc-1')
  })
})

describe('postOwnership', () => {
  it('returns ok:true on success', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-1' }))
    const result = await postOwnership('doc-1')
    expect(result.ok).toBe(true)
  })

  it('returns ok:false when already posted', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'ALREADY_POSTED: документ уже проведён' }))
    const result = await postOwnership('doc-1')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('ALREADY_POSTED')
  })
})
