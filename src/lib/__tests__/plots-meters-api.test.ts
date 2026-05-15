import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('../auth', () => ({
  getToken: () => 'test-token',
  getOrgId: () => 'org-123',
  logout: vi.fn(),
}))

import { updatePlot, addMeter, updateMeter, cancelDocument, getPlotsByOwner } from '../api'

function ok204() {
  return Promise.resolve({ ok: true, status: 204, json: async () => ({}) })
}
function okJson(data: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: async () => data })
}

beforeEach(() => mockFetch.mockReset())

describe('updatePlot', () => {
  it('sends PATCH to /plots?id=eq.<uuid>', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await updatePlot('plot-1', { number: '5', area: 6.1, is_active: true })
    expect(mockFetch.mock.calls[0][0]).toContain('/plots?id=eq.plot-1')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.number).toBe('5')
    expect(body.area).toBe(6.1)
    expect(body.is_active).toBe(true)
  })
})

describe('addMeter', () => {
  it('sends POST to /meters with correct fields', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await addMeter({ orgId: 'org-1', plotId: 'plot-1', meterType: 'water', serialNumber: 'SN-001' })
    expect(mockFetch.mock.calls[0][0]).toContain('/meters')
    expect(mockFetch.mock.calls[0][1].method).toBe('POST')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.organization_id).toBe('org-1')
    expect(body.plot_id).toBe('plot-1')
    expect(body.meter_type).toBe('water')
    expect(body.serial_number).toBe('SN-001')
    expect(body.is_active).toBe(true)
  })
})

describe('updateMeter', () => {
  it('sends PATCH to /meters?id=eq.<uuid>', async () => {
    mockFetch.mockResolvedValueOnce(ok204())
    await updateMeter('meter-1', { meter_type: 'electricity', serial_number: 'SN-002', is_active: false })
    expect(mockFetch.mock.calls[0][0]).toContain('/meters?id=eq.meter-1')
    expect(mockFetch.mock.calls[0][1].method).toBe('PATCH')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.meter_type).toBe('electricity')
    expect(body.is_active).toBe(false)
  })
})

describe('getPlotsByOwner', () => {
  it('fetches /plot_summary filtered by owner_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson([{ id: 'plot-1', number: '1', area: 6.05, is_active: true, owner_id: 'owner-1', owner_name: 'Test', owner_phone: null }]))
    const result = await getPlotsByOwner('owner-1')
    expect(result).toHaveLength(1)
    expect(mockFetch.mock.calls[0][0]).toContain('/plot_summary')
    expect(mockFetch.mock.calls[0][0]).toContain('owner_id=eq.owner-1')
  })
})

describe('cancelDocument', () => {
  it('posts to /rpc/cancel_document with p_doc_id', async () => {
    mockFetch.mockResolvedValueOnce(okJson({ ok: true }))
    const result = await cancelDocument('doc-1')
    expect(result.ok).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.p_doc_id).toBe('doc-1')
  })
})
