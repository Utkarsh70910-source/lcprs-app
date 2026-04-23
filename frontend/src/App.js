import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import SubmitReport from './pages/SubmitReport';
import ReportDetail from './pages/ReportDetail';
import Analytics from './pages/Analytics';

// New dedicated panels
import AdminDashboard from './pages/admin/AdminDashboard';
import UserPanel from './pages/user/UserPanel';

// Leaflet CSS
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#111827',
                color: '#F8FAFC',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with Navbar */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <>
                    <Navbar />
                    <div className="page-content">
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Citizen profile panel */}
                        <Route path="/profile" element={
                          <ProtectedRoute roles={['citizen']}>
                            <UserPanel />
                          </ProtectedRoute>
                        } />

                        {/* Submit a report */}
                        <Route path="/submit-report" element={
                          <ProtectedRoute roles={['citizen', 'admin']}>
                            <SubmitReport />
                          </ProtectedRoute>
                        } />

                        {/* Report detail */}
                        <Route path="/report/:id" element={<ReportDetail />} />

                        {/* Admin / Staff dedicated dashboard */}
                        <Route path="/admin" element={
                          <ProtectedRoute roles={['admin', 'staff']}>
                            <AdminDashboard />
                          </ProtectedRoute>
                        } />

                        {/* Analytics (admin/staff) */}
                        <Route path="/analytics" element={
                          <ProtectedRoute roles={['admin', 'staff']}>
                            <Analytics />
                          </ProtectedRoute>
                        } />

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                      </Routes>
                    </div>
                  </>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
