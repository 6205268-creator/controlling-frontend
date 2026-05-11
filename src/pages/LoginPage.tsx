import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPost } from '../lib/api'
import { saveAuth } from '../lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LoginResponse {
  token: string
  organization_id: string
  user_role: string
  user_id: string
}

interface MeResponse {
  full_name: string
  login: string
  role: string
  organization_id: string
  user_id: string
}

export default function LoginPage() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await apiPost<LoginResponse>('/rpc/login', {
        p_login: login,
        p_password: password,
      })
      // Save token first so /rpc/me can use it
      saveAuth({ token: res.token, organization_id: res.organization_id, user_role: res.user_role })
      // Get user's full name
      const me = await apiPost<MeResponse>('/rpc/me', {})
      saveAuth({
        token: res.token,
        organization_id: res.organization_id,
        user_role: res.user_role,
        full_name: me.full_name,
      })
      navigate('/')
    } catch {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-zinc-200 p-8 w-full max-w-sm shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-zinc-900">
            CONTROL<span className="text-blue-600">LING</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Система учёта СТ</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1 block">Логин</label>
            <Input
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="demo_a_treasury"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 mb-1 block">Пароль</label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Вход...' : 'Войти'}
          </Button>
        </form>
      </div>
    </div>
  )
}
