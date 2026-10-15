import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FleetManagement from './pages/FleetManagement';
import FuelManagement from './pages/FuelManagement';
import RMCOperations from './pages/RMCOperations';
import TeamChat from './pages/TeamChat';
import Finance from './pages/Finance';
import Alerts from './pages/Alerts';
import AdminPermissions from './pages/AdminPermissions';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fleet" element={<FleetManagement />} />
          <Route path="/fuel" element={<FuelManagement />} />
          <Route path="/rmc" element={<RMCOperations />} />
          <Route path="/chat" element={<TeamChat />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/admin/permissions" element={<AdminPermissions />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
