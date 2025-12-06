import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { useAppContext } from '../contexts/AppContext'
import LoadingSpinner from '../components/LoadingSpinner'
import LandingPage from '../components/LandingPage'

// Lazy load pages for code splitting
const SettingsPage = lazy(() => import('../pages/SettingsPage'))

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner />
  </div>
)

export function AppRoutes() {
  const { currentUser, isAuthenticated } = useAppContext()

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <LandingPage onSignInSuccess={() => {}} />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Redirect root to community */}
        <Route path="/" element={<Navigate to="/community" replace />} />
        
        {/* Main views */}
        <Route path="/community" element={<MainLayout view="community" />} />
        <Route path="/map" element={<MainLayout view="map" />} />
        
        {/* Profile */}
        <Route path="/profile/:id" element={<MainLayout view="profile" />} />
        
        {/* Modals as routes */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/network" element={<MainLayout view="network" />} />
        <Route path="/messages" element={<MainLayout view="messages" />} />
        <Route path="/cv-maker" element={<MainLayout view="cv-maker" />} />
        <Route path="/notifications" element={<MainLayout view="notifications" />} />
        <Route path="/auth" element={<MainLayout view="auth" />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/community" replace />} />
      </Routes>
    </Suspense>
  )
}

// Temporary MainLayout that renders based on view
// This will be replaced with proper page components
function MainLayout({ view }: { view: string }) {
  // This is a placeholder - the actual rendering happens in the legacy App component
  // We'll gradually migrate each view to its own page component
  return null
}

export default AppRoutes

