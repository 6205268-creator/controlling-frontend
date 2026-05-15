import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlotsPage from './pages/PlotsPage'
import MembersPage from './pages/MembersPage'
import MetersPage from './pages/MetersPage'
import CounterpartiesPage from './pages/CounterpartiesPage'
import DebtorsPage from './pages/DebtorsPage'
import JournalPage from './pages/JournalPage'
import SettingsPage from './pages/SettingsPage'

function AuthGuard({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="plots" element={<PlotsPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="meters" element={<MetersPage />} />
          <Route path="counterparties" element={<CounterpartiesPage />} />
          <Route path="contractors" element={<Navigate to="/counterparties" replace />} />
          <Route path="debtors" element={<DebtorsPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
