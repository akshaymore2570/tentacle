import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/authStore'
import { useTheme } from './store/themeStore'

import ProtectedRoute from './components/ProtectedRoute'
import LicenseGuard from './components/LicenseGuard'
import TopBar from './components/TopBar'
import LeftNav from './components/LeftNav'
import ThemePanel from './components/ThemePanel'
import Toast from './components/Toast'

import Login from './pages/Login'
import Campaign from './pages/Campaign'
import CrmList from './pages/CrmList'
import CrmDesigner from './pages/CrmDesigner'
import UserManagement from './pages/UserManagement'
import License from './pages/License'

// ---------- License page ko LicenseGuard ke bahar rakha ----------
function LicenseOnlyLayout() {
  const [toast, setToast] = useState('')
  return (
    <>
      <TopBar />
      <div className="app-body">
        <LeftNav onOpenTheme={() => {}} />
        <main className="main-content">
          <License showToast={setToast} />
        </main>
      </div>
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

// ---------- Normal app (LicenseGuard ke andar) ----------
function AppLayout() {
  const [themeOpen, setThemeOpen] = useState(false)
  const [toast, setToast] = useState('')

  return (
    <LicenseGuard>
      <TopBar />
      <div className="app-body">
        <LeftNav onOpenTheme={() => setThemeOpen((v) => !v)} />
        <main className="main-content">
          <Routes>
            <Route path="/campaign" element={<Campaign />} />
            <Route path="/crm" element={<CrmList showToast={setToast} />} />
            <Route path="/crm/:id" element={<CrmDesigner showToast={setToast} />} />
            <Route path="/users" element={<UserManagement showToast={setToast} />} />
            <Route path="*" element={<Navigate to="/campaign" replace />} />
          </Routes>
        </main>
      </div>

      {themeOpen && (
        <ThemePanel onClose={() => setThemeOpen(false)} showToast={setToast} />
      )}
      <Toast message={toast} onClose={() => setToast('')} />
    </LicenseGuard>
  )
}

export default function App() {
  const { token, fetchMe } = useAuth()
  const loadTheme = useTheme((s) => s.loadFromServer)

  useEffect(() => { loadTheme() }, [loadTheme])
  useEffect(() => { if (token) fetchMe() }, [token, fetchMe])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* License page — LicenseGuard ke bahar, hamesha accessible */}
      <Route
        path="/license"
        element={
          <ProtectedRoute>
            <LicenseOnlyLayout />
          </ProtectedRoute>
        }
      />

      {/* Baaki sab — LicenseGuard ke andar */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
