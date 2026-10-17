import { Status, Severity } from '../types';

export function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    pending_approval: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    returned: 'bg-orange-50 text-orange-700 border-orange-200',
    posted: 'bg-purple-50 text-purple-700 border-purple-200',
    reversed: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const labels: Record<Status, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
    posted: 'Posted',
    reversed: 'Reversed',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles: Record<Severity, string> = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    info: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

export function EquipmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    operational: 'bg-emerald-100 text-emerald-800',
    maintenance: 'bg-amber-100 text-amber-800',
    idle: 'bg-gray-100 text-gray-800',
    decommissioned: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}
