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
