/**
 * Part 07 — Mobile Submission Form
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, CheckCircle, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { getAsset } from '../services/assets';
import { getOperator } from '../services/operatorManagement';
import { createSubmission, addPhotoEvidence } from '../services/submissionService';
import { getRequiredEvidence, validateEvidenceCompleteness } from '../services/evidenceRules';
import { addToOfflineQueue } from '../services/offlineSync';
import { Asset } from '../services/assetTypes';
import { Operator } from '../services/assetLifecycleTypes';
import { EvidenceRule, PhotoEvidence } from '../services/submissionTypes';

export default function MobileSubmission() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Asset and operator
  const [assetId, setAssetId] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  
  // Form data
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'night' | 'full_day'>('full_day');
  const [openingHourMeter, setOpeningHourMeter] = useState<number | ''>('');
  const [closingHourMeter, setClosingHourMeter] = useState<number | ''>('');
  const [openingOdometer, setOpeningOdometer] = useState<number | ''>('');
  const [closingOdometer, setClosingOdometer] = useState<number | ''>('');
  const [fuelAtStart, setFuelAtStart] = useState<number | ''>('');
  const [fuelAtClose, setFuelAtClose] = useState<number | ''>('');
  const [operationalStatus, setOperationalStatus] = useState<'productive' | 'idle' | 'standby' | 'breakdown'>('productive');
  const [workPerformed, setWorkPerformed] = useState('');
  const [breakdownDetails, setBreakdownDetails] = useState('');
  const [operatorDeclaration, setOperatorDeclaration] = useState(false);
  
  // Photo evidence
  const [requiredEvidence, setRequiredEvidence] = useState<EvidenceRule[]>([]);
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoEvidence[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [currentPhotoCategory, setCurrentPhotoCategory] = useState<string>('');
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (assetId) {
      loadAssetData();
    }
  }, [assetId]);

  const loadAssetData = async () => {
    setLoading(true);
    try {
      const assetData = await getAsset(assetId);
      setAsset(assetData);
      
      if (assetData) {
        // Load required evidence rules
        const rules = await getRequiredEvidence(assetData.category, 'opening');
        setRequiredEvidence(rules);
      }
    } catch (error) {
      console.error('Failed to load asset', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const errors: string[] = [];

    if (!assetId) errors.push('Asset is required');
    if (!operatorId) errors.push('Operator is required');
    if (!operatorDeclaration) errors.push('Operator declaration is required');

    // Validate meter readings
    if (openingHourMeter !== '' && closingHourMeter !== '') {
      if (closingHourMeter < openingHourMeter) {
        errors.push('Closing hour meter cannot be less than opening');
      }
    }

    // Validate photo evidence
    if (asset) {
      const photoCategories = capturedPhotos.map(p => ({
        category: p.category,
        count: 1,
      }));

      const validation = await validateEvidenceCompleteness(
        asset.category,
        closingHourMeter !== '' ? 'closing' : 'opening',
        photoCategories
      );

      if (!validation.complete) {
        errors.push(`Missing required photos: ${validation.missing.map(m => m.category).join(', ')}`);
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleCapturePhoto = async (category: string) => {
    setCurrentPhotoCategory(category);
    setShowCamera(true);
    
    // In a real implementation, this would open the camera
    // For now, we'll simulate photo capture
    setTimeout(async () => {
      const mockPhoto: PhotoEvidence = {
        id: `photo-${Date.now()}`,
        submissionId: '',
        category: category as any,
        fileName: `photo_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1024000,
        sha256: 'mock-hash-' + Date.now(),
        captureTime: new Date().toISOString(),
        deviceId: 'mock-device',
        deviceModel: 'Mock Phone',
        appVersion: '1.0.0',
        gpsLatitude: 19.0760,
        gpsLongitude: 72.8777,
        gpsAccuracy: 10,
        attachmentId: 'mock-attachment-' + Date.now(),
        overlayData: {
          assetCode: asset?.assetCode || '',
          dateTime: new Date().toISOString(),
          operatorName: operator?.fullName || '',
        },
        createdAt: new Date().toISOString(),
      };

      setCapturedPhotos(prev => [...prev, mockPhoto]);
      setShowCamera(false);
    }, 1000);
  };

  const handleSubmit = async (isOffline: boolean = false) => {
    const isValid = await validateForm();
    
    if (!isValid && !showExceptionDialog) {
      // Check if we should show exception dialog
      const hasMissingPhotos = validationErrors.some(e => e.includes('Missing required photos'));
      if (hasMissingPhotos) {
        setShowExceptionDialog(true);
        return;
      }
      return;
    }

    if (!asset || !operator) {
      alert('Asset and operator must be selected');
      return;
    }

    setSubmitting(true);
    try {
      const submissionData = {
        assetId,
        operatorId,
        date,
        shift,
        projectId: asset.currentProjectId,
        siteId: asset.currentSiteId,
        plantId: asset.currentPlantId,
        openingHourMeter: openingHourMeter !== '' ? Number(openingHourMeter) : undefined,
        closingHourMeter: closingHourMeter !== '' ? Number(closingHourMeter) : undefined,
        openingOdometer: openingOdometer !== '' ? Number(openingOdometer) : undefined,
        closingOdometer: closingOdometer !== '' ? Number(closingOdometer) : undefined,
        fuelAtStart: fuelAtStart !== '' ? Number(fuelAtStart) : undefined,
        fuelAtClose: fuelAtClose !== '' ? Number(fuelAtClose) : undefined,
        operationalStatus,
        workPerformed: workPerformed || undefined,
        breakdownDetails: breakdownDetails || undefined,
        operatorDeclaration,
        declarationText: 'I confirm these readings are correct',
        clientCaptureTime: new Date().toISOString(),
        serverReceiptTime: new Date().toISOString(),
        isOffline,
        photoEvidence: capturedPhotos,
        ocrResults: [],
        hasException: showExceptionDialog,
        exceptionReason: showExceptionDialog ? exceptionReason : undefined,
      };

      if (isOffline || !isOnline) {
        // Add to offline queue
        await addToOfflineQueue({
          type: 'submission',
          submissionData,
          clientUuid: `sub-${Date.now()}`,
          idempotencyKey: `idem-${Date.now()}`,
          clientCaptureTime: new Date().toISOString(),
          encrypted: false,
        });

        alert('Submission saved to offline queue. Will sync when online.');
        navigate('/submissions/offline');
      } else {
        // Submit directly
        const submission = await createSubmission(submissionData as any, operatorId);
        
        // Add photos
        for (const photo of capturedPhotos) {
          await addPhotoEvidence(submission.id, photo, operatorId);
        }

        alert('Submission created successfully');
        navigate('/submissions');
      }
    } catch (error) {
      console.error('Failed to submit', error);
      alert('Failed to submit: ' + (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMissingPhotos = () => {
    if (!asset) return [];
    
    const photoCategories = capturedPhotos.map(p => ({
      category: p.category,
      count: 1,
    }));

    // This would be async in real implementation
    return requiredEvidence.filter(rule => {
      const submitted = photoCategories.find(p => p.category === rule.photoCategory);
      return !submitted || submitted.count < rule.minimumCount;
    });
  };

  const missingPhotos = getMissingPhotos();

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">New Submission</h1>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && !showExceptionDialog && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Validation Errors</h3>
              <ul className="mt-2 text-sm text-red-800 list-disc list-inside">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Exception Dialog */}
      {showExceptionDialog && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">Missing Required Photos</h3>
          <p className="text-sm text-amber-800 mb-4">
            You can submit with an exception reason, which will be reviewed by your supervisor.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Exception Reason</label>
              <select
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select reason...</option>
                <option value="camera_failure">Camera Failure</option>
                <option value="meter_not_functional">Meter Not Functional</option>
                <option value="safety_concern">Safety Concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExceptionDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit(isOnline)}
                disabled={!exceptionReason}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
              >
                Submit with Exception
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {!showExceptionDialog && (
        <div className="space-y-6">
          {/* Asset Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset & Operator</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                <input
                  type="text"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="Scan QR or enter asset ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operator ID</label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="Enter operator ID"
                />
              </div>

              {asset && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">{asset.assetCode}</p>
                  <p className="text-xs text-blue-700">{asset.make} {asset.model}</p>
                </div>
              )}
            </div>
          </div>

          {/* Date & Shift */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Shift</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                >
                  <option value="full_day">Full Day</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </div>
            </div>
          </div>

          {/* Meter Readings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Meter Readings</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Hour Meter</label>
                  <input
                    type="number"
                    step="0.1"
                    value={openingHourMeter}
                    onChange={(e) => setOpeningHourMeter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Hour Meter</label>
                  <input
                    type="number"
                    step="0.1"
                    value={closingHourMeter}
                    onChange={(e) => setClosingHourMeter(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opening Odometer</label>
                  <input
                    type="number"
                    value={openingOdometer}
                    onChange={(e) => setOpeningOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Closing Odometer</label>
                  <input
                    type="number"
                    value={closingOdometer}
                    onChange={(e) => setClosingOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Photo Evidence */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Photo Evidence</h2>
            
            <div className="space-y-3">
              {requiredEvidence.map((rule) => {
                const captured = capturedPhotos.filter(p => p.category === rule.photoCategory);
                const isComplete = captured.length >= rule.minimumCount;
                
                return (
                  <div key={rule.id} className={`p-3 rounded-lg border ${isComplete ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{rule.description}</p>
                        <p className="text-xs text-gray-600">
                          {captured.length} / {rule.minimumCount} captured
                        </p>
                      </div>
                      <button
                        onClick={() => handleCapturePhoto(rule.photoCategory)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          isComplete ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                        }`}
                      >
                        <Camera className="w-4 h-4 inline mr-1" />
                        Capture
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {capturedPhotos.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Captured Photos ({capturedPhotos.length})</h3>
                <div className="grid grid-cols-3 gap-2">
                  {capturedPhotos.map((photo) => (
                    <div key={photo.id} className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Operational Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Operational Status</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={operationalStatus}
                  onChange={(e) => setOperationalStatus(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                >
                  <option value="productive">Productive</option>
                  <option value="idle">Idle</option>
                  <option value="standby">Standby</option>
                  <option value="breakdown">Breakdown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed</label>
                <textarea
                  value={workPerformed}
                  onChange={(e) => setWorkPerformed(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                  placeholder="Describe work performed..."
                />
              </div>

              {operationalStatus === 'breakdown' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown Details</label>
                  <textarea
                    value={breakdownDetails}
                    onChange={(e) => setBreakdownDetails(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                    placeholder="Describe breakdown..."
                  />
                </div>
              )}
            </div>
          </div>

          {/* Declaration */}
          <div className="bg-white rounded-lg shadow p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={operatorDeclaration}
                onChange={(e) => setOperatorDeclaration(e.target.checked)}
                className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                I confirm these readings are correct and the photos accurately represent the asset condition.
              </span>
            </label>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4">
            {isOnline ? (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Submitting...' : 'Submit Online'}
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 text-lg font-medium"
              >
                <WifiOff className="w-5 h-5" />
                {submitting ? 'Saving...' : 'Save Offline'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
