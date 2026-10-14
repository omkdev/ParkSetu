import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { errorMessage } from '../lib/api'

function useAfterAuth() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = useAfterAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Welcome back</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <input className="input" type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="input" type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Log in'}
      </button>
      <p className="text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="text-blue-600 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const from = useAfterAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'DRIVER' as 'DRIVER' | 'OWNER' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={from} replace />

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ ...form, phone: form.phone || undefined })
      navigate(form.role === 'OWNER' ? '/dashboard' : from, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Create your account</h1>
      {error && <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <input className="input" placeholder="Full name" required minLength={2} value={form.name} onChange={set('name')} />
      <input className="input" type="email" placeholder="Email" required value={form.email} onChange={set('email')} />
      <input className="input" type="tel" placeholder="Phone (optional)" minLength={7} value={form.phone} onChange={set('phone')} />
      <input className="input" type="password" placeholder="Password (min 8 characters)" required minLength={8} value={form.password} onChange={set('password')} />
      <select className="input" value={form.role} onChange={set('role')}>
        <option value="DRIVER">I want to find parking</option>
        <option value="OWNER">I own a parking lot</option>
      </select>
      <button className="btn w-full" disabled={busy}>
        {busy ? 'Creating…' : 'Sign up'}
      </button>
      <p className="text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="text-blue-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  )
}
