import { Route, Routes } from 'react-router-dom'
import { Layout, RequireAuth } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { LotPage } from './pages/LotPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { BookingsPage } from './pages/BookingsPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="lots/:id" element={<LotPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route element={<RequireAuth />}>
          <Route path="bookings" element={<BookingsPage />} />
        </Route>
        <Route element={<RequireAuth roles={['OWNER', 'ADMIN']} />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<RequireAuth roles={['ADMIN']} />}>
          <Route path="admin/users" element={<UsersPage />} />
        </Route>
        <Route path="*" element={<p className="text-slate-500">Page not found.</p>} />
      </Route>
    </Routes>
  )
}
