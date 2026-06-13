import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePortalAuthStore } from './store/portalAuthStore';
import { AppLayout } from './components/layout/AppLayout';
import { PortalLayout } from './components/layout/PortalLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientEditPage } from './pages/ClientEditPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { NewIncidentPage } from './pages/NewIncidentPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { MapPage } from './pages/MapPage';
import { WarehouseLayout } from './components/layout/WarehouseLayout';
import { WarehouseProductsPage } from './pages/warehouse/WarehouseProductsPage';
import { WarehouseClientsPage } from './pages/warehouse/WarehouseClientsPage';
import { WarehouseReceiptsPage } from './pages/warehouse/WarehouseReceiptsPage';
import { WarehouseIssuesPage } from './pages/warehouse/WarehouseIssuesPage';
import { WarehouseProductJournalPage } from './pages/warehouse/WarehouseProductJournalPage';
import { CustomerAssetsPage } from './pages/CustomerAssetsPage';
import { UsersPage } from './pages/UsersPage';
import { SetupLayout } from './components/layout/SetupLayout';
import { AssetTypesSetupPage } from './pages/setup/AssetTypesSetupPage';
import { IncidentStatusesSetupPage } from './pages/setup/IncidentStatusesSetupPage';
import { CompanySettingsSetupPage } from './pages/setup/CompanySettingsSetupPage';
import { PortalLoginPage } from './pages/portal/PortalLoginPage';
import { PortalIncidentsPage } from './pages/portal/PortalIncidentsPage';
import { PortalNewIncidentPage } from './pages/portal/PortalNewIncidentPage';
import { PortalIncidentDetailPage } from './pages/portal/PortalIncidentDetailPage';
import { MyProfilePage } from './pages/MyProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = usePortalAuthStore((s) => s.token);
  if (!token) return <Navigate to="/portal/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/portal/login" element={<PortalLoginPage />} />
      <Route
        path="/portal"
        element={
          <PortalProtectedRoute>
            <PortalLayout />
          </PortalProtectedRoute>
        }
      >
        <Route index element={<PortalIncidentsPage />} />
        <Route path="incidents/new" element={<PortalNewIncidentPage />} />
        <Route path="incidents/:id" element={<PortalIncidentDetailPage />} />
      </Route>

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/new" element={<ClientEditPage />} />
        <Route path="clients/:id" element={<ClientEditPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/new" element={<NewIncidentPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="assets" element={<CustomerAssetsPage />} />
        <Route path="warehouse" element={<WarehouseLayout />}>
          <Route index element={<Navigate to="/warehouse/products" replace />} />
          <Route path="products" element={<WarehouseProductsPage />} />
          <Route path="journal" element={<WarehouseProductJournalPage />} />
          <Route path="clients" element={<WarehouseClientsPage />} />
          <Route path="receipts" element={<WarehouseReceiptsPage />} />
          <Route path="issues" element={<WarehouseIssuesPage />} />
        </Route>
        <Route path="map" element={<MapPage />} />
        <Route path="profile" element={<MyProfilePage />} />
        <Route path="setup" element={<SetupLayout />}>
          <Route index element={<Navigate to="/setup/users" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="company" element={<CompanySettingsSetupPage />} />
          <Route path="asset-types" element={<AssetTypesSetupPage />} />
          <Route path="incident-statuses" element={<IncidentStatusesSetupPage />} />
        </Route>
        <Route path="users" element={<Navigate to="/setup/users" replace />} />
      </Route>
    </Routes>
  );
}
