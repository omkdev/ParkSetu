import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { CarFront, LogOut } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import type { Role } from '../lib/types'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-slate-900'
  }`

export function Layout() {
  const { user, logout } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-blue-700">
            <CarFront className="h-6 w-6" /> ParkSetu
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navClass}>
              Find parking
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navClass}>
                My bookings
              </NavLink>
            )}
            {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin/users" className={navClass}>
                Users
              </NavLink>
            )}
            {user ? (
              <div className="ml-3 flex items-center gap-3 border-l border-slate-200 pl-3">
                <span className="hidden text-sm text-slate-600 sm:inline">
                  {user.name} · {user.role.toLowerCase()}
                </span>
                <button onClick={logout} className="btn-secondary" aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="ml-3 flex gap-2">
                <Link to="/login" className="btn-secondary">
                  Log in
                </Link>
                <Link to="/register" className="btn">
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="text-slate-500">Loading…</p>
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
