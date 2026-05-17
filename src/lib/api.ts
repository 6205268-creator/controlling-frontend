import { getToken, getOrgId, logout } from './auth'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://103.35.190.117/pg'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    logout()
    window.location.href = '/login'
    throw new ApiError(401, 'Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new ApiError(res.status, text)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export function orgParam(): string {
  const id = getOrgId()
  return id ? `organization_id=eq.${id}` : ''
}

// --- Ownership ---

export interface Contractor {
  id: string
  full_name: string
  contractor_type: 'individual' | 'legal_entity'
  phone: string | null
}

export interface RpcResult {
  ok: boolean
  error?: string
  [key: string]: unknown
}

export async function searchContractors(orgId: string, query: string): Promise<Contractor[]> {
  return apiFetch<Contractor[]>('/rpc/search_contractors', {
    method: 'POST',
    body: JSON.stringify({ p_org_id: orgId, p_query: query }),
  })
}

export async function createContractor(params: {
  orgId: string
  fullName: string
  contractorType: 'individual' | 'legal_entity'
  phone?: string
}): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/create_contractor', {
    method: 'POST',
    body: JSON.stringify({
      p_org_id:          params.orgId,
      p_full_name:       params.fullName,
      p_contractor_type: params.contractorType,
      p_phone:           params.phone ?? null,
    }),
  })
}

export async function createOwnership(params: {
  orgId: string
  contractorId: string
  objectType: string
  objectId: string
  docDate: string
  notes?: string
}): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/create_ownership', {
    method: 'POST',
    body: JSON.stringify({
      p_org_id:        params.orgId,
      p_contractor_id: params.contractorId,
      p_object_type:   params.objectType,
      p_object_id:     params.objectId,
      p_doc_date:      params.docDate,
      p_notes:         params.notes ?? null,
    }),
  })
}

export async function postOwnership(docId: string): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/post_ownership', {
    method: 'POST',
    body: JSON.stringify({ p_doc_id: docId }),
  })
}

// --- Payments ---

export interface PaymentParams {
  orgId: string
  contractorId: string
  amount: number
  docDate?: string
  paymentRef?: string
}

export async function createPayment(params: PaymentParams): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/create_payment', {
    method: 'POST',
    body: JSON.stringify({
      p_org_id:        params.orgId,
      p_contractor_id: params.contractorId,
      p_amount:        params.amount,
      p_doc_date:      params.docDate ?? null,
      p_payment_ref:   params.paymentRef ?? null,
    }),
  })
}

export async function postPayment(docId: string): Promise<RpcResult> {
  return apiFetch<RpcResult>('/rpc/post_payment', {
    method: 'POST',
    body: JSON.stringify({ p_doc_id: docId }),
  })
}

// --- Debtors ---

export interface DebtorItem {
  organization_id: string
  object_type: string
  object_id: string
  object_name: string
  owner_name: string
  total_debt: number
}

// --- Journal ---

export interface JournalItem {
  id: string
  doc_type: string
  doc_date: string
  status: string
  amount: number | null
  contractor_name: string | null
}

// --- Plots edit ---

export async function updatePlot(
  id: string,
  data: { number: string; area: number; is_active: boolean }
): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/update_plot', {
    p_org_id:    getOrgId(),
    p_plot_id:   id,
    p_number:    data.number,
    p_area:      data.area,
    p_is_active: data.is_active,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}

export interface PlotSummary {
  id: string
  number: string
  area: number
  is_active: boolean
  owner_id: string | null
  owner_name: string | null
  owner_phone: string | null
  total_debt: number
}

export async function getPlotsByOwner(ownerId: string): Promise<PlotSummary[]> {
  return apiFetch<PlotSummary[]>(`/plot_summary?owner_id=eq.${ownerId}&${orgParam()}`)
}

// --- Meters ---

export async function addMeter(params: {
  orgId: string
  plotId: string
  meterType: string
  serialNumber: string
}): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/create_meter', {
    p_org_id:        params.orgId,
    p_plot_id:       params.plotId,
    p_meter_type:    params.meterType,
    p_serial_number: params.serialNumber,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}

export async function updateMeter(
  id: string,
  data: { meter_type: string; serial_number: string; is_active: boolean }
): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/update_meter', {
    p_org_id:        getOrgId(),
    p_meter_id:      id,
    p_meter_type:    data.meter_type,
    p_serial_number: data.serial_number,
    p_is_active:     data.is_active,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}

export async function updateContractor(
  id: string,
  data: {
    full_name: string
    contractor_type: 'individual' | 'legal_entity'
    phone: string | null
    email: string | null
  }
): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/update_contractor', {
    p_org_id:          getOrgId(),
    p_contractor_id:   id,
    p_full_name:       data.full_name,
    p_contractor_type: data.contractor_type,
    p_phone:           data.phone,
    p_email:           data.email,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}

// --- Cancel / delete document ---

export async function cancelDocument(docId: string): Promise<RpcResult> {
  return apiPost<RpcResult>('/rpc/cancel_document', { p_doc_id: docId })
}

export async function deleteDraft(docId: string): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/delete_draft', { p_doc_id: docId })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка удаления')
}

// --- Org settings ---

export interface OrgSettings {
  organization_id: string
  lock_date: string | null
  current_period: string | null
}

export async function getOrgSettings(): Promise<OrgSettings | null> {
  const rows = await apiFetch<OrgSettings[]>(`/org_settings?${orgParam()}`)
  return rows[0] ?? null
}

export async function setLockDate(lockDate: string | null): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/set_lock_date', {
    p_org_id:    getOrgId(),
    p_lock_date: lockDate,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}

export async function setCurrentPeriod(period: string): Promise<void> {
  const r = await apiPost<RpcResult>('/rpc/set_current_period', {
    p_org_id:  getOrgId(),
    p_period:  period,
  })
  if (!r.ok) throw new Error(r.error ?? 'Ошибка сохранения')
}
