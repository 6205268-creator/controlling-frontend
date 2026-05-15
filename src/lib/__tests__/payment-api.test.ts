import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { createPayment, postPayment } from '../api'

function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('createPayment', () => {
  it('posts to /rpc/create_payment with correct params', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-1' }))
    const result = await createPayment({
      orgId: 'org-1',
      contractorId: 'c-1',
      amount: 100.50,
      docDate: '2026-05-14',
    })
    expect(result.ok).toBe(true)
    expect(result.doc_id).toBe('doc-pay-1')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_amount).toBe(100.50)
    expect(body.p_doc_date).toBe('2026-05-14')
    expect(body.p_payment_ref).toBeNull()
  })

  it('includes payment_ref when provided', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-2' }))
    await createPayment({
      orgId: 'org-1', contractorId: 'c-1', amount: 50,
      docDate: '2026-05-14', paymentRef: 'ERIP-12345',
    })
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_payment_ref).toBe('ERIP-12345')
  })

  it('returns ok:false on backend error', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'INVALID_AMOUNT' }))
    const result = await createPayment({
      orgId: 'org-1', contractorId: 'c-1', amount: 0, docDate: '2026-05-14',
    })
    expect(result.ok).toBe(false)
    expect(result.error).toBe('INVALID_AMOUNT')
  })
})

describe('postPayment', () => {
  it('posts to /rpc/post_payment with doc_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true, doc_id: 'doc-pay-1' }))
    const result = await postPayment('doc-pay-1')
    expect(result.ok).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_doc_id).toBe('doc-pay-1')
  })

  it('returns ok:false when already posted', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: false, error: 'ALREADY_POSTED' }))
    const result = await postPayment('doc-pay-1')
    expect(result.ok).toBe(false)
  })
})
