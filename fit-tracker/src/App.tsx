import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { FitProvider } from './hooks/useFit'
import { AuthPage } from './pages/AuthPage'
import { ProgressPage } from './pages/ProgressPage'
import { RoutinesPage } from './pages/RoutinesPage'
import { TodayPage } from './pages/TodayPage'

function LoginRoute() {
  const { user, isCloudEnabled } = useAuth()
  if (!isCloudEnabled) return <Navigate to="/" replace />
  if (user) return <Navigate to="/" replace />
  return <AuthPage />
}

function AppRoutes() {
  return (
    <FitProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="login" element={<LoginRoute />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<TodayPage />} />
              <Route path="routines" element={<RoutinesPage />} />
              <Route path="progress" element={<ProgressPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </FitProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
