import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetupPage } from '@/features/auth/SetupPage'
import { ContainersPage } from '@/features/containers/ContainersPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { HostDetailsPage } from '@/features/hosts/HostDetailsPage'
import { HostsPage } from '@/features/hosts/HostsPage'
import {
  ImagesPage,
  NetworksPage,
  VolumesPage,
} from '@/features/inventory/InventoryPages'
import { MetricsPage } from '@/features/metrics/MetricsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { useAuthStore } from '@/stores/auth'

export function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <Routes>
          {/* Pre-session screens render without the app shell. */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Everything else requires a session. */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell>
                  <AppRoutes />
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      </AuthGate>
    </BrowserRouter>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/hosts" element={<HostsPage />} />
      <Route path="/hosts/:hostId" element={<HostDetailsPage />} />
      <Route path="/containers" element={<ContainersPage />} />
      <Route path="/images" element={<ImagesPage />} />
      <Route path="/networks" element={<NetworksPage />} />
      <Route path="/volumes" element={<VolumesPage />} />
      <Route path="/metrics" element={<MetricsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

/**
 * Resolves the session once, before any route renders. Without this, /login
 * would flash for a moment on every reload while the token was being checked.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const bootstrap = useAuthStore((state) => state.bootstrap)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            src="/docksight.png"
            alt="DockSight"
            width={96}
            height={96}
            className="h-24 w-24"
          />
        </div>
        <p className="text-sm text-muted-foreground">Starting DockSight…</p>
      </div>
    )
  }

  return <>{children}</>
}
