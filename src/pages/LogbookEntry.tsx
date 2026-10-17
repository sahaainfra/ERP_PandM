/**
 * Part 06 — Logbook Entry (Mobile-First)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { getAsset } from '../services/assets';
import { getOperator } from '../services/operatorManagement';
import { createLogbook, getLogbook, updateLogbook, submitLogbook, listActivityCodes, listReasonCodes } from '../services/logbookService';
import { EquipmentLogbook, TimeSplitReason } from '../services/logbookTypes';
import { Asset } from '../services/assetTypes';
import { Operator } from '../services/assetLifecycleTypes';

export default function LogbookEntry() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [logbook, setLogbook] = useState<EquipmentLogbook | null>(null);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'morning' | 'afternoon' | 'night' | 'full_day'>('full_day');
  const [activityCode, setActivityCode] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [supervisingOfficerId, setSupervisingOfficerId] = useState('');
  
  // Meter readings
  const [openingHourMeter, setOpeningHourMeter] = useState<number | ''>('');
  const [closingHourMeter, setClosingHourMeter] = useState<number | ''>('');
  const [openingOdometer, setOpeningOdometer] = useState<number | ''>('');
  const [closingOdometer, setClosingOdometer] = useState<number | ''>('');
  
  // Time split
  const [productiveHours, setProductiveHours] = useState(0);
  const [idleHours, setIdleHours] = useState(0);
  const [standbyHours, setStandbyHours] = useState(0);
  const [breakdownHours, setBreakdownHours] = useState(0);
  
  // Output
  const [workQuantity, setWorkQuantity] = useState<number | ''>('');
  const [workQuantityUnit, setWorkQuantityUnit] = useState('');
  const [tripCount, setTripCount] = useState<number | ''>('');
  
  // Fuel
  const [fuelAtStart, setFuelAtStart] = useState<number | ''>('');
  const [fuelReceived, setFuelReceived] = useState<number | ''>('');
  const [fuelAtClose, setFuelAtClose] = useState<number | ''>('');
  
  // Events
  const [supervisorComments, setSupervisorComments] = useState('');
  
  // Activity and reason codes
  const [activityCodes, setActivityCodes] = useState<any[]>([]);
  const [reasonCodes, setReasonCodes] = useState<any[]>([]);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load activity and reason codes
      const activities = await listActivityCodes();
      setActivityCodes(activities);
      
      const reasons = await listReasonCodes();
      setReasonCodes(reasons);

      if (id) {
        // Edit mode - load existing logbook
        const existingLogbook = await getLogbook(id);
        if (existingLogbook) {
          setLogbook(existingLogbook);
          
          // Load asset and operator
          const assetData = await getAsset(existingLogbook.assetId);
          setAsset(assetData);
          
          const operatorData = await getOperator(existingLogbook.operatorId);
          setOperator(operatorData);
          
          // Populate form
          setDate(existingLogbook.date);
          setShift(existingLogbook.shift);
          setActivityCode(existingLogbook.activityCode || '');
          setActivityDescription(existingLogbook.activityDescription || '');
          setSupervisingOfficerId(existingLogbook.supervisingOfficerId);
          setOpeningHourMeter(existingLogbook.openingHourMeter || '');
          setClosingHourMeter(existingLogbook.closingHourMeter || '');
          setOpeningOdometer(existingLogbook.openingOdometer || '');
          setClosingOdometer(existingLogbook.closingOdometer || '');
          setProductiveHours(existingLogbook.productiveHours);
          setIdleHours(existingLogbook.idleHours);
          setStandbyHours(existingLogbook.standbyHours);
          setBreakdownHours(existingLogbook.breakdownHours);
          setWorkQuantity(existingLogbook.workQuantity || '');
          setWorkQuantityUnit(existingLogbook.workQuantityUnit || '');
          setTripCount(existingLogbook.tripCount || '');
          setFuelAtStart(existingLogbook.fuelAtStart || '');
          setFuelReceived(existingLogbook.fuelReceived || '');
          setFuelAtClose(existingLogbook.fuelAtClose || '');
          setSupervisorComments(existingLogbook.supervisorComments || '');
        }
      } else {
        // New logbook - load asset from query params
        // TODO: Get assetId from query params or context
        // For now, we'll need to pass it somehow
      }
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    // Required fields
    if (!date) errors.push('Date is required');
    if (!shift) errors.push('Shift is required');
    if (!supervisingOfficerId) errors.push('Supervising officer is required');

    // Meter readings validation
    if (openingHourMeter !== '' && closingHourMeter !== '') {
      if (closingHourMeter < openingHourMeter) {
        errors.push('Closing hour meter cannot be less than opening');
      }
    }

    if (openingOdometer !== '' && closingOdometer !== '') {
      if (closingOdometer < openingOdometer) {
        errors.push('Closing odometer cannot be less than opening');
      }
    }

    // Time split validation
    const totalSplit = productiveHours + idleHours + standbyHours + breakdownHours;
    const calculatedHours = closingHourMeter && openingHourMeter 
      ? closingHourMeter - openingHourMeter 
      : 0;
    
    if (calculatedHours > 0 && Math.abs(totalSplit - calculatedHours) > 0.5) {
      errors.push(`Time split (${totalSplit}h) does not match operating hours (${calculatedHours}h)`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async (submit: boolean = false) => {
    if (!validateForm()) {
      return;
    }

    if (!asset || !operator) {
      alert('Asset and operator must be selected');
      return;
    }

    setSaving(true);
    try {
      const logbookData = {
        date,
        shift,
        assetId: asset.id,
        operatorId: operator.id,
        projectId: asset.currentProjectId,
        siteId: asset.currentSiteId,
        plantId: asset.currentPlantId,
        activityCode: activityCode || undefined,
        activityDescription: activityDescription || undefined,
        supervisingOfficerId,
        openingHourMeter: openingHourMeter !== '' ? Number(openingHourMeter) : undefined,
        closingHourMeter: closingHourMeter !== '' ? Number(closingHourMeter) : undefined,
        openingOdometer: openingOdometer !== '' ? Number(openingOdometer) : undefined,
        closingOdometer: closingOdometer !== '' ? Number(closingOdometer) : undefined,
        calculatedOperatingHours: openingHourMeter !== '' && closingHourMeter !== '' 
          ? Number(closingHourMeter) - Number(openingHourMeter) 
          : undefined,
        calculatedKilometres: openingOdometer !== '' && closingOdometer !== ''
          ? Number(closingOdometer) - Number(openingOdometer)
          : undefined,
        productiveHours,
        idleHours,
        standbyHours,
        breakdownHours,
        timeSplitReasonCodes: [],
        workQuantity: workQuantity !== '' ? Number(workQuantity) : undefined,
        workQuantityUnit: workQuantityUnit || undefined,
        tripCount: tripCount !== '' ? Number(tripCount) : undefined,
        fuelAtStart: fuelAtStart !== '' ? Number(fuelAtStart) : undefined,
        fuelReceived: fuelReceived !== '' ? Number(fuelReceived) : undefined,
        fuelAtClose: fuelAtClose !== '' ? Number(fuelAtClose) : undefined,
        events: [],
        supervisorComments: supervisorComments || undefined,
        photoAttachmentIds: [],
      };

      let savedLogbook: EquipmentLogbook;
      
      if (logbook) {
        // Update existing
        savedLogbook = await updateLogbook(logbook.id, logbookData as any, operator.id);
      } else {
        // Create new
        savedLogbook = await createLogbook(logbookData as any, operator.id);
      }

      if (submit) {
        await submitLogbook(savedLogbook.id, operator.id);
        alert('Logbook submitted successfully');
        navigate('/logbooks');
      } else {
        alert('Logbook saved successfully');
        setLogbook(savedLogbook);
      }
    } catch (error) {
      console.error('Failed to save logbook', error);
      alert('Failed to save logbook: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {logbook ? 'Edit Logbook' : 'New Logbook Entry'}
        </h1>
        {asset && (
          <p className="text-gray-600 mt-1">
            {asset.assetCode} - {asset.make} {asset.model}
          </p>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
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

      {/* Form */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value as any)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              >
                <option value="full_day">Full Day</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="night">Night</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Code</label>
              <select
                value={activityCode}
                onChange={(e) => setActivityCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              >
                <option value="">Select activity...</option>
                {activityCodes.map(code => (
                  <option key={code.id} value={code.code}>{code.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activity Description</label>
              <textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Describe the work performed..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervising Officer ID</label>
              <input
                type="text"
                value={supervisingOfficerId}
                onChange={(e) => setSupervisingOfficerId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="Enter supervisor ID"
              />
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Odometer (km)</label>
                <input
                  type="number"
                  value={openingOdometer}
                  onChange={(e) => setOpeningOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Odometer (km)</label>
                <input
                  type="number"
                  value={closingOdometer}
                  onChange={(e) => setClosingOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Time Split */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Split (Hours)</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Productive</label>
              <input
                type="number"
                step="0.1"
                value={productiveHours}
                onChange={(e) => setProductiveHours(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idle</label>
              <input
                type="number"
                step="0.1"
                value={idleHours}
                onChange={(e) => setIdleHours(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Standby</label>
              <input
                type="number"
                step="0.1"
                value={standbyHours}
                onChange={(e) => setStandbyHours(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown</label>
              <input
                type="number"
                step="0.1"
                value={breakdownHours}
                onChange={(e) => setBreakdownHours(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold">{productiveHours + idleHours + standbyHours + breakdownHours}h</span>
            </p>
          </div>
        </div>

        {/* Output */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Output</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Quantity</label>
                <input
                  type="number"
                  value={workQuantity}
                  onChange={(e) => setWorkQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={workQuantityUnit}
                  onChange={(e) => setWorkQuantityUnit(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="m³, tonnes, trips..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trip Count</label>
              <input
                type="number"
                value={tripCount}
                onChange={(e) => setTripCount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Fuel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Fuel (Litres)</h2>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">At Start</label>
              <input
                type="number"
                step="0.1"
                value={fuelAtStart}
                onChange={(e) => setFuelAtStart(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received</label>
              <input
                type="number"
                step="0.1"
                value={fuelReceived}
                onChange={(e) => setFuelReceived(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">At Close</label>
              <input
                type="number"
                step="0.1"
                value={fuelAtClose}
                onChange={(e) => setFuelAtClose(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.0"
              />
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Supervisor Comments</h2>
          <textarea
            value={supervisorComments}
            onChange={(e) => setSupervisorComments(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            placeholder="Any additional comments..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg font-medium"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-lg font-medium"
          >
            <CheckCircle className="w-5 h-5" />
            {saving ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
