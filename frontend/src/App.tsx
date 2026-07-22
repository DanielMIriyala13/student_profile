import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardRedirect from './components/DashboardRedirect';
import DashboardLayout from './components/DashboardLayout';
import PageSkeleton from './components/PageSkeleton';

// Dashboards Lazy Loaded
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard'));
const HODDashboard = lazy(() => import('./pages/HODDashboard'));
const PlacementDashboard = lazy(() => import('./pages/PlacementDashboard'));
const InstitutionDashboard = lazy(() => import('./pages/InstitutionDashboard'));
const Search = lazy(() => import('./pages/Search'));

export const App: React.FC = () => {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Role dashboard redirection router */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRedirect />
            </ProtectedRoute>
          }
        />

        {/* Shared Layout Protected Section */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'ADMIN']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hod/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOD', 'ADMIN']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/placement/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PLACEMENT_OFFICER', 'ADMIN']}>
                <PlacementDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/institution/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <InstitutionDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute allowedRoles={['FACULTY', 'HOD', 'PLACEMENT_OFFICER', 'ADMIN']}>
                <Search />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default Catchall Redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;
