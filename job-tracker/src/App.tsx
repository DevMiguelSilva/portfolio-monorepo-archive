import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingSpinner } from './components/LoadingSpinner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { JobsProvider } from './hooks/useJobs'
import { ProfileProvider } from './hooks/useProfile'
import { AddJobPage } from './pages/AddJobPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { ProfilePage } from './pages/ProfilePage'

function AppRoutes() {
  const { user, loading, isCloudEnabled } = useAuth()

  if (isCloudEnabled && loading) {
    return <LoadingSpinner label="Checking session…" />
  }

  if (isCloudEnabled && !user) {
    return <AuthPage />
  }

  return (
    <JobsProvider>
      <ProfileProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="add" element={<AddJobPage />} />
              <Route path="job/:id" element={<JobDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ProfileProvider>
    </JobsProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
