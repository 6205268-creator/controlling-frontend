const TOKEN_KEY = 'controlling_token'
const ORG_KEY = 'controlling_org_id'
const ROLE_KEY = 'controlling_role'
const NAME_KEY = 'controlling_name'

export interface AuthData {
  token: string
  organization_id: string
  user_role: string
  full_name?: string
}

export function saveAuth(data: AuthData) {
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(ORG_KEY, data.organization_id)
  localStorage.setItem(ROLE_KEY, data.user_role)
  if (data.full_name) localStorage.setItem(NAME_KEY, data.full_name)
}

export function getToken(): string | null { return localStorage.getItem(TOKEN_KEY) }
export function getOrgId(): string | null { return localStorage.getItem(ORG_KEY) }
export function getRole(): string | null { return localStorage.getItem(ROLE_KEY) }
export function getName(): string | null { return localStorage.getItem(NAME_KEY) }
export function isAuthenticated(): boolean { return !!getToken() }

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ORG_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(NAME_KEY)
}
