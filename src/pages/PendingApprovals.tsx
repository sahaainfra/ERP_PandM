/**
 * Part 08 — Pending Approvals List
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import { listSubmissions } from '../services/submissionService';
import { OperatorSubmission } from '../services/submissionTypes';

export default function PendingApprovals() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<OperatorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'returned' | 'pending_evidence'>('submitted');

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter;
      const data = await listSubmissions({ status });
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load submissions', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'returned':
        return <XCircle className="w-5 h-5 text-amber-600" />;
      case 'pending_evidence':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-50 border-blue-200';
      case 'returned':
        return 'bg-amber-50 border-amber-200';
      case 'pending_evidence':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve operator submissions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter by Status</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setFilter('submitted')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'submitted' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => setFilter('returned')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'returned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Returned
          </button>
          <button
            onClick={() => setFilter('pending_evidence')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'pending_evidence' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pending Evidence
          </button>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading submissions...</div>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-500">No pending submissions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <div
              key={submission.id}
              onClick={() => navigate(`/approvals/${submission.id}`)}
              className={`bg-white rounded-lg shadow p-6 border-l-4 cursor-pointer hover:shadow-lg transition-shadow ${getStatusColor(submission.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(submission.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {submission.submissionNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {submission.date} • {submission.shift}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Asset</p>
                      <p className="font-medium text-gray-900">{submission.assetId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Operator</p>
                      <p className="font-medium text-gray-900">{submission.operatorId}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Operating Hours</p>
                      <p className="font-medium text-gray-900">
                        {submission.calculatedOperatingHours?.toFixed(1) || '—'}h
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900 capitalize">{submission.status}</p>
                    </div>
                  </div>

                  {submission.validationFlags && submission.validationFlags.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        {submission.validationFlags.length} validation flag(s)
                      </span>
                    </div>
                  )}

                  {submission.hasException && (
                    <div className="mt-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-orange-700">
                        Exception: {submission.exceptionReason}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
