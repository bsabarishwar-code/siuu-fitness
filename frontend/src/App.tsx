import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { api } from './api/client'
import SetupPage from './pages/SetupPage'
import LoginPage from './pages/LoginPage'
import MainLayout from './pages/MainLayout'

export default function App() {
  const { token, setupDone, setSetupDone, logout } = useAuthStore()

  useEffect(() => {
    api.setupStatus().then(r => setSetupDone(r.done)).catch(() => setSetupDone(false))
  }, [setSetupDone])

  useEffect(() => {
    if (!token) return
    api.verify().catch(() => logout())
  }, [token, logout])

  if (setupDone === null) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: '#0A0A0A' }}>
        <div className="w-10 h-10 rounded-full border-2 border-app-red border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!setupDone) return <SetupPage />
  if (!token) return <LoginPage />
  return <MainLayout />
}
