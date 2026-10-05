import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './store/authStore'
import { useTheme } from './store/themeStore'

import ProtectedRoute from './components/ProtectedRoute'
import SuperAdminRoute from './components/SuperAdminRoute'
import LicenseGuard from './components/LicenseGuard'
import TopBar from './components/TopBar'
import LeftNav from './components/LeftNav'
import ThemePanel from './components/ThemePanel'
import Toast from './components/Toast'

import Login from './pages/Login'
import Campaign from './pages/Campaign'
import CampaignList from './pages/CampaignList'
import CampaignBuilder from './pages/CampaignBuilder'
import CrmList from './pages/CrmList'
import CrmDesigner from './pages/CrmDesigner'
import CrmTablesList from './pages/CrmTablesList'
import CrmTableBuilder from './pages/CrmTableBuilder'
import CrmTableData from './pages/CrmTableData'
import UserManagement from './pages/UserManagement'
import License from './pages/License'


function LicenseOnlyLayout() {
  const [toast, setToast] = useState('')
  return (
    <>
      <TopBar />
      <div className="app-body">
        <LeftNav onOpenTheme={() => {}} />
        <main className="main-content"><License showToast={setToast} /></main>
      </div>
      <Toast message={toast} onClose={() => setToast('')} />
    </>
  )
}

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
            <Route path="/campaigns" element={<CampaignList showToast={setToast} />} />
            <Route path="/campaigns/new" element={<CampaignBuilder showToast={setToast} />} />
            <Route path="/campaigns/:id" element={<CampaignBuilder showToast={setToast} />} />
            <Route path="/crm" element={<CrmList showToast={setToast} />} />
            <Route path="/crm/:id" element={<CrmDesigner showToast={setToast} />} />
            <Route path="/crm-table" element={<CrmTablesList showToast={setToast} />} />
            <Route path="/crm-table/new" element={<CrmTableBuilder showToast={setToast} />} />
            <Route path="/crm-table/:id/edit" element={<CrmTableBuilder showToast={setToast} />} />
            <Route path="/crm-table/:id" element={<CrmTableData showToast={setToast} />} />
            <Route path="/users" element={<UserManagement showToast={setToast} />} />

            <Route path="*" element={<Navigate to="/campaign" replace />} />
          </Routes>
        </main>
      </div>
      {themeOpen && <ThemePanel onClose={() => setThemeOpen(false)} showToast={setToast} />}
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
      <Route
        path="/license"
        element={
          <ProtectedRoute>
            <SuperAdminRoute>
              <LicenseOnlyLayout />
            </SuperAdminRoute>
          </ProtectedRoute>
        }
      />
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
