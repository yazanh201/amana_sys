import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import MainLayout from './components/layouts/MainLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Team Leader Pages
import TeamLeaderDashboard from './pages/teamLeader/Dashboard';
import CreateDailyLog from './pages/teamLeader/CreateDailyLog';
import EditDailyLog from './pages/teamLeader/EditDailyLog';
import ViewDailyLog from './pages/teamLeader/ViewDailyLog';

// Manager Pages
import ManagerDashboard from './pages/manager/Dashboard';
import AllLogs from './pages/manager/AllLogs';
import LogDetails from './pages/manager/LogDetails';

/**
 * 🔐 Protected Route
 * מגן על נתיבים ומונע redirect מוקדם בזמן טעינת auth
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // ⏳ בזמן טעינת auth – לא עושים כלום
  if (loading) {
    return null; // אפשר להחליף ב-Spinner אם תרצה
  }

  // ❌ לא מחובר
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ❌ אין הרשאה
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // ✅ הכל תקין
  return children;
};

function App() {
  return (
    <Routes>
      {/* 🔓 Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 🔐 Protected Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* 👷‍♂️ Team Leader */}
        <Route
          index
          element={
            <ProtectedRoute allowedRoles={['Team Leader']}>
              <TeamLeaderDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="create-log"
          element={
            <ProtectedRoute allowedRoles={['Team Leader']}>
              <CreateDailyLog />
            </ProtectedRoute>
          }
        />

        <Route
          path="edit-log/:id"
          element={
            <ProtectedRoute allowedRoles={['Team Leader']}>
              <EditDailyLog />
            </ProtectedRoute>
          }
        />

        <Route
          path="view-log/:id"
          element={
            <ProtectedRoute allowedRoles={['Team Leader']}>
              <ViewDailyLog />
            </ProtectedRoute>
          }
        />

        {/* 👨‍💼 Manager */}
        <Route
          path="manager"
          element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="all-logs"
          element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <AllLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="log-details/:id"
          element={
            <ProtectedRoute allowedRoles={['Manager']}>
              <LogDetails />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
