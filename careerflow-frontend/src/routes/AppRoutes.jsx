import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute.jsx'
import PublicOnlyRoute from '../auth/PublicOnlyRoute.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import AuthLayout from '../layouts/AuthLayout.jsx'
import HomePage from '../pages/HomePage.jsx'
import LoginPage from '../pages/LoginPage.jsx'
import RegisterPage from '../pages/RegisterPage.jsx'
import DashboardPage from '../pages/DashboardPage.jsx'
import ProfilePage from '../pages/ProfilePage.jsx'
import ResumePage from '../pages/ResumePage.jsx'
import CareerDirectionsPage from '../pages/CareerDirectionsPage.jsx'
import CareerDirectionCreatePage from '../pages/CareerDirectionCreatePage.jsx'
import CareerDirectionFormPage from '../pages/CareerDirectionFormPage.jsx'
import CareerDirectionDetailPage from '../pages/CareerDirectionDetailPage.jsx'
import JobsPage from '../pages/JobsPage.jsx'
import JobFormPage from '../pages/JobFormPage.jsx'
import JobDetailPage from '../pages/JobDetailPage.jsx'
import ApplicationsPage from '../pages/ApplicationsPage.jsx'
import ApplicationDetailPage from '../pages/ApplicationDetailPage.jsx'
import InterviewsPage from '../pages/InterviewsPage.jsx'
import InterviewDetailPage from '../pages/InterviewDetailPage.jsx'
import AnalyticsPage from '../pages/AnalyticsPage.jsx'
import NotFoundPage from '../pages/NotFoundPage.jsx'

export default function AppRoutes() {
  return (
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
  )
}