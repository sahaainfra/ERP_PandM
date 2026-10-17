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
import MobileFuelIssue from './pages/MobileFuelIssue';
import TankDashboard from './pages/TankDashboard';
import DailyVerificationSheet from './pages/DailyVerificationSheet';
import AssetFuelHistory from './pages/AssetFuelHistory';
import BenchmarkRegister from './pages/BenchmarkRegister';
import CalibrationRegister from './pages/CalibrationRegister';
import WorkOrderList from './pages/WorkOrderList';
import PMPlanList from './pages/PMPlanList';
import ReliabilityDashboard from './pages/ReliabilityDashboard';
import IntegrationDashboard from './pages/IntegrationDashboard';
import TelematicsDashboard from './pages/TelematicsDashboard';
import PlantList from './pages/PlantList';
import PlantControlBoard from './pages/PlantControlBoard';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import FleetDashboard from './pages/FleetDashboard';
import OperatorReportingDashboard from './pages/OperatorReportingDashboard';
import FuelVerificationDashboard from './pages/FuelVerificationDashboard';
import RMCProductionDashboard from './pages/RMCProductionDashboard';
import DispatchLogisticsDashboard from './pages/DispatchLogisticsDashboard';
import FinancialDashboard from './pages/FinancialDashboard';
import AlertActionCenter from './pages/AlertActionCenter';
import ReportCatalogue from './pages/ReportCatalogue';
import ReportViewer from './pages/ReportViewer';
import AuditTrailViewer from './pages/AuditTrailViewer';
import EvidencePackGenerator from './pages/EvidencePackGenerator';

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
          <Route path="/fuel/issue" element={<MobileFuelIssue />} />
          <Route path="/fuel/tanks" element={<TankDashboard />} />
          <Route path="/fuel/verification" element={<DailyVerificationSheet />} />
          <Route path="/fuel/benchmarks" element={<BenchmarkRegister />} />
          <Route path="/fuel/calibrations" element={<CalibrationRegister />} />
          <Route path="/assets/:id/fuel-history" element={<AssetFuelHistory />} />
          <Route path="/maintenance/work-orders" element={<WorkOrderList />} />
          <Route path="/maintenance/pm-plans" element={<PMPlanList />} />
          <Route path="/maintenance/reliability" element={<ReliabilityDashboard />} />
          <Route path="/integrations" element={<IntegrationDashboard />} />
          <Route path="/integrations/telematics" element={<TelematicsDashboard />} />
          <Route path="/rmc/plants" element={<PlantList />} />
          <Route path="/rmc/plants/:id" element={<PlantControlBoard />} />
          <Route path="/dashboards/executive" element={<ExecutiveDashboard />} />
          <Route path="/dashboards/fleet" element={<FleetDashboard />} />
          <Route path="/dashboards/operator" element={<OperatorReportingDashboard />} />
          <Route path="/dashboards/fuel" element={<FuelVerificationDashboard />} />
          <Route path="/dashboards/rmc-production" element={<RMCProductionDashboard />} />
          <Route path="/dashboards/dispatch-logistics" element={<DispatchLogisticsDashboard />} />
          <Route path="/dashboards/financial" element={<FinancialDashboard />} />
          <Route path="/alerts/action-center" element={<AlertActionCenter />} />
          <Route path="/reports" element={<ReportCatalogue />} />
          <Route path="/reports/:id" element={<ReportViewer />} />
          <Route path="/audit-trail" element={<AuditTrailViewer />} />
          <Route path="/evidence-packs" element={<EvidencePackGenerator />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
