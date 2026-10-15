/**
 * Part 08 — Approver Review Screen (Desktop)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, RotateCcw, Camera, AlertTriangle, TrendingUp, Clock, User, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getSubmission } from '../services/submissionService';
import { getReviewContext, approveSubmission, rejectSubmission, returnForCorrection, requestMoreEvidence } from '../services/approvalReview';
import { OperatorSubmission } from '../services/submissionTypes';
import { ApprovalReview, ValidationFlag } from '../services/approvalWorkflowTypes';

export default function ApproverReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<OperatorSubmission | null>(null);
  const [reviewContext, setReviewContext] = useState<any>(null);
  const [action, setAction] = useState<'approve' | 'reject' | 'return' | 'request_evidence' | null>(null);
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const submissionData = await getSubmission(id!);
      setSubmission(submissionData);

      if (submissionData) {
        const context = await getReviewContext(id!);
        setReviewContext(context);
      }
    } catch (error) {
      console.error('Failed to load submission', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!submission || !action) return;

    setSubmitting(true);
    try {
      // In a real app, get current user from auth context
      const reviewerId = 'reviewer-1';
      const reviewerRole = 'site_manager';

      switch (action) {
        case 'approve':
          await approveSubmission(submission.id, reviewerId, reviewerRole, comment);
          alert('Submission approved successfully');
          break;
        case 'reject':
          if (!reason) {
            alert('Reason is required for rejection');
            return;
          }
          await rejectSubmission(submission.id, reviewerId, reviewerRole, reason, comment);
          alert('Submission rejected');
          break;
        case 'return':
          if (!reason) {
            alert('Instructions are required for return');
            return;
          }
          await returnForCorrection(submission.id, reviewerId, reviewerRole, reason, comment);
          alert('Submission returned for correction');
          break;
        case 'request_evidence':
          if (!reason) {
            alert('Evidence description is required');
            return;
          }
          await requestMoreEvidence(submission.id, reviewerId, reviewerRole, reason, comment);
          alert('Evidence request sent');
          break;
      }

      navigate('/approvals/pending');
    } catch (error) {
      console.error('Failed to process action', error);
      alert('Failed to process action: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading submission...</div>
      </div>
    );
  }

  if (!submission || !reviewContext) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Submission not found</p>
          <button
            onClick={() => navigate('/approvals/pending')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Pending Approvals
          </button>
        </div>
      </div>
    );
  }

  const { previousApprovedSubmission, usageTrend7Days, typicalDailyUsage, validationFlags } = reviewContext;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/approvals/pending')}
          className="text-blue-600 hover:text-blue-900 mb-4"
        >
          ← Back to Pending Approvals
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Review Submission</h1>
        <p className="text-gray-600 mt-1">
          {submission.submissionNumber} • {submission.date} • {submission.shift}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Submission */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Current Submission
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Asset</p>
                <p className="font-medium text-gray-900">{submission.assetId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Operator</p>
                <p className="font-medium text-gray-900">{submission.operatorId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Opening Hour Meter</p>
                <p className="font-medium text-gray-900">{submission.openingHourMeter?.toFixed(1) || '—'}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Closing Hour Meter</p>
                <p className="font-medium text-gray-900">{submission.closingHourMeter?.toFixed(1) || '—'}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Operating Hours</p>
                <p className="font-medium text-gray-900">{submission.calculatedOperatingHours?.toFixed(1) || '—'}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kilometres</p>
                <p className="font-medium text-gray-900">{submission.calculatedKilometres?.toLocaleString() || '—'} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuel at Start</p>
                <p className="font-medium text-gray-900">{submission.fuelAtStart?.toFixed(1) || '—'} L</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fuel at Close</p>
                <p className="font-medium text-gray-900">{submission.fuelAtClose?.toFixed(1) || '—'} L</p>
              </div>
            </div>

            {submission.workPerformed && (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Work Performed</p>
                <p className="font-medium text-gray-900">{submission.workPerformed}</p>
              </div>
            )}
          </div>

          {/* Previous Approved Reading */}
          {previousApprovedSubmission && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Previous Approved Reading
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium text-gray-900">{previousApprovedSubmission.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Operating Hours</p>
                  <p className="font-medium text-gray-900">{previousApprovedSubmission.calculatedOperatingHours?.toFixed(1) || '—'}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Closing Hour Meter</p>
                  <p className="font-medium text-gray-900">{previousApprovedSubmission.closingHourMeter?.toFixed(1) || '—'}h</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Kilometres</p>
                  <p className="font-medium text-gray-900">{previousApprovedSubmission.calculatedKilometres?.toLocaleString() || '—'} km</p>
                </div>
              </div>
            </div>
          )}

          {/* 7-Day Usage Trend */}
          {usageTrend7Days.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                7-Day Usage Trend
              </h2>
              
              {typicalDailyUsage && (
                <p className="text-sm text-gray-600 mb-4">
                  Typical daily usage: <span className="font-medium">{typicalDailyUsage.toFixed(1)}h</span>
                </p>
              )}

              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={usageTrend7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="operatingHours" fill="#3b82f6" name="Operating Hours" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Photo Gallery */}
          {submission.photoEvidence && submission.photoEvidence.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Photo Evidence ({submission.photoEvidence.length})
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                {submission.photoEvidence.map((photo, idx) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80"
                  >
                    <Camera className="w-12 h-12 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Flags */}
          {validationFlags && validationFlags.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Validation Flags ({validationFlags.length})
              </h2>
              
              <div className="space-y-3">
                {validationFlags.map((flag: ValidationFlag, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      flag.severity === 'error' ? 'bg-red-50 border-red-200' :
                      flag.severity === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                        flag.severity === 'error' ? 'text-red-600' :
                        flag.severity === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <p className={`font-medium ${
                          flag.severity === 'error' ? 'text-red-900' :
                          flag.severity === 'warning' ? 'text-amber-900' :
                          'text-blue-900'
                        }`}>
                          {flag.code}
                        </p>
                        <p className={`text-sm ${
                          flag.severity === 'error' ? 'text-red-800' :
                          flag.severity === 'warning' ? 'text-amber-800' :
                          'text-blue-800'
                        }`}>
                          {flag.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-6">
          {/* Operator Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Operator Details
            </h2>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Operator ID</p>
                <p className="font-medium text-gray-900">{submission.operatorId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Submitted At</p>
                <p className="font-medium text-gray-900">
                  {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Capture Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(submission.clientCaptureTime).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Offline Submission</p>
                <p className="font-medium text-gray-900">
                  {submission.isOffline ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </div>

          {/* OCR Hints */}
          {submission.ocrResults && submission.ocrResults.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">OCR Hints</h2>
              
              <div className="space-y-3">
                {submission.ocrResults.map((ocr, idx) => (
                  <div key={ocr.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">OCR Value</p>
                    <p className="font-medium text-gray-900">{ocr.parsedValue}</p>
                    {ocr.mismatch && (
                      <p className="text-xs text-amber-600 mt-1">
                        ⚠️ Mismatch with typed value: {ocr.operatorValue}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => setAction('approve')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                Approve
              </button>
              <button
                onClick={() => setAction('reject')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                <XCircle className="w-5 h-5" />
                Reject
              </button>
              <button
                onClick={() => setAction('return')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium"
              >
                <RotateCcw className="w-5 h-5" />
                Return for Correction
              </button>
              <button
                onClick={() => setAction('request_evidence')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Camera className="w-5 h-5" />
                Request More Evidence
              </button>
            </div>

            {/* Action Form */}
            {action && (
              <div className="mt-6 space-y-4">
                {(action === 'reject' || action === 'return' || action === 'request_evidence') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {action === 'reject' ? 'Reason (Required)' : 
                       action === 'return' ? 'Instructions (Required)' :
                       'Evidence Required (Required)'}
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={
                        action === 'reject' ? 'Enter reason for rejection...' :
                        action === 'return' ? 'Enter instructions for correction...' :
                        'Describe required evidence...'
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comment (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any additional comments..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAction(null);
                      setReason('');
                      setComment('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {submitting ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl">
            <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center mb-4">
              <Camera className="w-24 h-24 text-gray-400" />
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Category:</span> {selectedPhoto.category}</p>
              <p><span className="font-medium">Capture Time:</span> {new Date(selectedPhoto.captureTime).toLocaleString()}</p>
              {selectedPhoto.gpsLatitude && (
                <p><span className="font-medium">GPS:</span> {selectedPhoto.gpsLatitude}, {selectedPhoto.gpsLongitude}</p>
              )}
              {selectedPhoto.deviceModel && (
                <p><span className="font-medium">Device:</span> {selectedPhoto.deviceModel}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
