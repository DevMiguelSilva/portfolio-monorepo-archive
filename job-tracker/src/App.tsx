import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingSpinner } from './components/LoadingSpinner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { InboxProvider } from './hooks/useInbox'
import { JobsProvider } from './hooks/useJobs'
import { MasterCvProvider } from './hooks/useMasterCv'
import { PortalFeedsProvider } from './hooks/usePortalFeeds'
import { SavedSearchesProvider } from './hooks/useSavedSearches'
import { TailoredDocsProvider } from './hooks/useTailoredDocs'
import { AddJobPage } from './pages/AddJobPage'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { InboxPage } from './pages/InboxPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { MasterCvPage } from './pages/MasterCvPage'
import { PortalsPage } from './pages/PortalsPage'

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
      <MasterCvProvider>
        <SavedSearchesProvider>
          <TailoredDocsProvider>
            <PortalFeedsProvider>
              <InboxProvider>
                <BrowserRouter>
                  <Routes>
                    <Route element={<Layout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="inbox" element={<InboxPage />} />
                      <Route path="portals" element={<PortalsPage />} />
                      <Route path="add" element={<AddJobPage />} />
                      <Route path="job/:id" element={<JobDetailPage />} />
                      <Route path="cv" element={<MasterCvPage />} />
                    </Route>
                  </Routes>
                </BrowserRouter>
              </InboxProvider>
            </PortalFeedsProvider>
          </TailoredDocsProvider>
        </SavedSearchesProvider>
      </MasterCvProvider>
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
