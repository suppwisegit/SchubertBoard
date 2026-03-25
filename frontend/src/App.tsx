import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SocketProvider, useSocket } from './context/SocketContext';
import KidsDashboard from './pages/KidsDashboard';
import ParentDashboard from './pages/ParentDashboard';
import './index.css';

// ─── Toast Container ─────────────────────────────────────────────────
function ToastContainer() {
  const { toasts, dismissToast } = useSocket();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.leaving ? 'leaving' : ''}`} onClick={() => dismissToast(t.id)}>
          <span className="toast-icon">{t.icon}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Dark Mode Toggle ───────────────────────────────────────────────
function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <button className="theme-toggle" onClick={() => setDark(!dark)} title="Dark Mode umschalten">
      {dark ? '☀️' : '🌙'}
    </button>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────
function AppInner() {
  return (
    <>
      <ThemeToggle />
      <ToastContainer />
      <BrowserRouter>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<Navigate to="/kids" replace />} />
            <Route path="/kids" element={<KidsDashboard />} />
            <Route path="/:parentSecret" element={<ParentDashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <SocketProvider>
      <AppInner />
    </SocketProvider>
  );
}

export default App;
