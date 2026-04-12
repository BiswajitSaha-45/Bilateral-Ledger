import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import DashboardPage from './components/dashboard/DashboardPage';
import LedgerPage from './components/ledger/LedgerPage';
import TransactionDetailPage from './components/ledger/TransactionDetailPage';
import NewTransactionPage from './components/ledger/NewTransactionPage';
import Layout from './components/shared/Layout';
import './styles/index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
      <Route path="/ledger" element={<PrivateRoute><Layout><LedgerPage /></Layout></PrivateRoute>} />
      <Route path="/ledger/new" element={<PrivateRoute><Layout><NewTransactionPage /></Layout></PrivateRoute>} />
      <Route path="/ledger/:id" element={<PrivateRoute><Layout><TransactionDetailPage /></Layout></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1d27',
              color: '#e8eaf0',
              border: '1px solid #2a2d3e',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1d27' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#1a1d27' } },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;