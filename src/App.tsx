import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetProfile from './pages/AssetProfile';
import AllocationCalendar from './pages/AllocationCalendar';
import OperatorList from './pages/OperatorList';
import OperatorProfile from './pages/OperatorProfile';
import FleetManagement from './pages/FleetManagement';
import FuelManagement from './pages/FuelManagement';
import RMCOperations from './pages/RMCOperations';
import TeamChat from './pages/TeamChat';
import Finance from './pages/Finance';
import Alerts from './pages/Alerts';
import AdminPermissions from './pages/AdminPermissions';
import LogbookEntry from './pages/LogbookEntry';
import SupervisorDailySheet from './pages/SupervisorDailySheet';
import AssetLogbookHistory from './pages/AssetLogbookHistory';
import MobileSubmission from './pages/MobileSubmission';
import OfflineQueueManagement from './pages/OfflineQueueManagement';
import PendingApprovals from './pages/PendingApprovals';
import ApproverReview from './pages/ApproverReview';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<AssetList />} />
          <Route path="/assets/:id" element={<AssetProfile />} />
          <Route path="/allocations" element={<AllocationCalendar />} />
          <Route path="/operators" element={<OperatorList />} />
          <Route path="/operators/:id" element={<OperatorProfile />} />
          <Route path="/fleet" element={<FleetManagement />} />
          <Route path="/fuel" element={<FuelManagement />} />
          <Route path="/rmc" element={<RMCOperations />} />
          <Route path="/chat" element={<TeamChat />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/admin/permissions" element={<AdminPermissions />} />
          <Route path="/logbooks/new" element={<LogbookEntry />} />
          <Route path="/logbooks/:id" element={<LogbookEntry />} />
          <Route path="/logbooks/supervisor" element={<SupervisorDailySheet />} />
          <Route path="/logbooks/asset/:id" element={<AssetLogbookHistory />} />
          <Route path="/submissions/new" element={<MobileSubmission />} />
          <Route path="/submissions/offline" element={<OfflineQueueManagement />} />
          <Route path="/approvals/pending" element={<PendingApprovals />} />
          <Route path="/approvals/:id" element={<ApproverReview />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
