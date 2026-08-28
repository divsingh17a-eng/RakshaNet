import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './context/SocketContext';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import RiskMapPage from './pages/RiskMapPage';
import SosAlertsPage from './pages/SosAlertsPage';
import RelocationPlannerPage from './pages/RelocationPlannerPage';
import ResourceMonitorPage from './pages/ResourceMonitorPage';
import RoutesResponsePage from './pages/RoutesResponsePage';
import VerificationQueuePage from './pages/VerificationQueuePage';
import ReportsExportPage from './pages/ReportsExportPage';
import AuditLogPage from './pages/AuditLogPage';
import AdminConsolePage from './pages/AdminConsolePage';
import MobilePreviewPage from './pages/MobilePreviewPage';
import NotFoundPage from './pages/NotFoundPage';
import { ROLES } from './constants';

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/mobile-preview" element={<MobilePreviewPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="map" element={<RiskMapPage />} />
            <Route path="sos" element={<SosAlertsPage />} />
            <Route path="relocation" element={<RelocationPlannerPage />} />
            <Route path="resources" element={<ResourceMonitorPage />} />
            <Route path="routes-response" element={<RoutesResponsePage />} />
            <Route path="verification" element={<VerificationQueuePage />} />
            <Route path="reports" element={<ReportsExportPage />} />
            <Route
              path="audit"
              element={
                <ProtectedRoute roles={[ROLES.ADMIN]}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute roles={[ROLES.ADMIN, ROLES.SDMA_OFFICER, ROLES.DDMA_OFFICER]}>
                  <AdminConsolePage />
                </ProtectedRoute>
              }
            />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}
