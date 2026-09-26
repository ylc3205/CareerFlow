import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import PublicOnlyRoute from '../auth/PublicOnlyRoute.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import Loading from '../components/Loading.jsx'

const HomePage = lazy(() => import('../pages/HomePage.jsx'))
const LoginPage = lazy(() => import('../pages/LoginPage.jsx'))
const RegisterPage = lazy(() => import('../pages/RegisterPage.jsx'))
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'))
const ResumePage = lazy(() => import('../pages/ResumePage.jsx'))
const CareerDirectionsPage = lazy(() => import('../pages/CareerDirectionsPage.jsx'))
const CareerDirectionCreatePage = lazy(() => import('../pages/CareerDirectionCreatePage.jsx'))
const CareerDirectionFormPage = lazy(() => import('../pages/CareerDirectionFormPage.jsx'))
const CareerDirectionDetailPage = lazy(() => import('../pages/CareerDirectionDetailPage.jsx'))
const JobsPage = lazy(() => import('../pages/JobsPage.jsx'))
const JobFormPage = lazy(() => import('../pages/JobFormPage.jsx'))
const JobDetailPage = lazy(() => import('../pages/JobDetailPage.jsx'))
const ApplicationsPage = lazy(() => import('../pages/ApplicationsPage.jsx'))
const ApplicationDetailPage = lazy(() => import('../pages/ApplicationDetailPage.jsx'))
const InterviewsPage = lazy(() => import('../pages/InterviewsPage.jsx'))
const InterviewDetailPage = lazy(() => import('../pages/InterviewDetailPage.jsx'))
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage.jsx'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage.jsx'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loading fullscreen label="Loading..." />}>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/career-directions" element={<CareerDirectionsPage />} />
          <Route path="/career-directions/create" element={<CareerDirectionCreatePage />} />
          <Route path="/career-directions/new" element={<CareerDirectionFormPage />} />
          <Route path="/career-directions/:id" element={<CareerDirectionDetailPage />} />
          <Route path="/career-directions/:id/edit" element={<CareerDirectionFormPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/new" element={<JobFormPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />
          <Route path="/jobs/:id/edit" element={<JobFormPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/interviews/:id" element={<InterviewDetailPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}