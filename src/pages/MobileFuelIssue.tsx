/**
 * Part 09 — Mobile Fuel Issue Screen
 * 
 * Mobile-first interface for fuel attendants to issue fuel to assets
 */

import React, { useState, useEffect } from 'react';
import { Fuel, Camera, CheckCircle, AlertTriangle } from 'lucide-react';
import { listStoragePoints, listMeasuringInstruments } from '../services/fuelMasters';
import { createFuelIssue, submitFuelIssue } from '../services/fuelIssues';
import { listAssets } from '../services/assets';
import { StoragePoint, MeasuringInstrument } from '../services/fuelTypes';
import { Asset } from '../services/assetTypes';

export default function MobileFuelIssue() {
  const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [instruments, setInstruments] = useState<MeasuringInstrument[]>([]);
  
  const [selectedStoragePoint, setSelectedStoragePoint] = useState<StoragePoint | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedDispenser, setSelectedDispenser] = useState<MeasuringInstrument | null>(null);
  
  const [meterOpening, setMeterOpening] = useState<string>('');
  const [meterClosing, setMeterClosing] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [assetHourMeter, setAssetHourMeter] = useState<string>('');
  const [assetOdometer, setAssetOdometer] = useState<string>('');
  const [fullTankFill, setFullTankFill] = useState<boolean>(false);
  const [costPerLitre, setCostPerLitre] = useState<string>('85.50'); // Default rate
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storagePointsData, assetsData, instrumentsData] = await Promise.all([
        listStoragePoints(),
        listAssets(),
        listMeasuringInstruments(),
      ]);
      
      setStoragePoints(storagePointsData.filter(sp => sp.isActive));
      setAssets(assetsData.filter(a => a.status === 'deployed' || a.status === 'available'));
      setInstruments(instrumentsData.filter(i => i.type === 'dispenser_meter' && i.isActive));
    } catch (err) {
      setError('Failed to load data');
    }
  };

  const handleStoragePointChange = (storagePointId: string) => {
    const sp = storagePoints.find(s => s.id === storagePointId);
    setSelectedStoragePoint(sp || null);
    
    // Filter dispensers for this storage point
    const dispensers = instruments.filter(i => i.storagePointId === storagePointId);
    if (dispensers.length > 0) {
      setSelectedDispenser(dispensers[0]);
    }
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    setSelectedAsset(asset || null);
    
    // Pre-fill current meter readings if available
    if (asset) {
      if (asset.currentHourMeter !== undefined) {
        setAssetHourMeter(asset.currentHourMeter.toString());
      }
      if (asset.currentOdometer !== undefined) {
        setAssetOdometer(asset.currentOdometer.toString());
      }
    }
  };

  const calculateQuantity = () => {
    if (meterOpening && meterClosing) {
      const opening = parseFloat(meterOpening);
      const closing = parseFloat(meterClosing);
      const calculated = closing - opening;
      if (calculated > 0) {
        setQuantity(calculated.toFixed(2));
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedStoragePoint || !selectedAsset || !selectedDispenser) {
      setError('Please select storage point, asset, and dispenser');
      return;
    }

    if (!meterOpening || !meterClosing || !quantity) {
      setError('Please enter meter readings');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const issue = await createFuelIssue({
        issueDate: new Date().toISOString().split('T')[0],
        storagePointId: selectedStoragePoint.id,
        dispenserInstrumentId: selectedDispenser.id,
        meterOpening: parseFloat(meterOpening),
        meterClosing: parseFloat(meterClosing),
        assetId: selectedAsset.id,
        operatorId: selectedAsset.defaultOperatorId || 'operator-1', // TODO: Get from auth context
        quantity: parseFloat(quantity),
        assetHourMeter: assetHourMeter ? parseFloat(assetHourMeter) : undefined,
        assetOdometer: assetOdometer ? parseFloat(assetOdometer) : undefined,
        fullTankFill,
        costPerLitre: parseFloat(costPerLitre),
        projectId: selectedAsset.currentProjectId,
        siteId: selectedAsset.currentSiteId,
        issuingAttendantId: 'attendant-1', // TODO: Get from auth context
        status: 'draft',
        postedToInventory: false,
      });

      // Auto-submit the issue
      await submitFuelIssue(issue.id, 'attendant-1');

      setSuccess(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setMeterOpening('');
        setMeterClosing('');
        setQuantity('');
        setAssetHourMeter('');
        setAssetOdometer('');
        setFullTankFill(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create fuel issue');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Fuel Issued Successfully</h2>
          <p className="text-gray-600">
            {quantity}L issued to {selectedAsset?.assetCode}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Fuel className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Issue Fuel</h1>
              <p className="text-sm text-gray-600">Record fuel issuance to asset</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          {/* Storage Point Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Point / Tank
            </label>
            <select
              value={selectedStoragePoint?.id || ''}
              onChange={(e) => handleStoragePointChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            >
              <option value="">Select storage point...</option>
              {storagePoints.map(sp => (
                <option key={sp.id} value={sp.id}>
                  {sp.name} ({sp.code})
                </option>
              ))}
            </select>
          </div>

          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset
            </label>
            <select
              value={selectedAsset?.id || ''}
              onChange={(e) => handleAssetChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            >
              <option value="">Select asset...</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.assetCode} - {asset.make} {asset.model}
                </option>
              ))}
            </select>
          </div>

          {/* Dispenser Selection */}
          {selectedStoragePoint && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dispenser / Meter
              </label>
              <select
                value={selectedDispenser?.id || ''}
                onChange={(e) => {
                  const dispenser = instruments.find(i => i.id === e.target.value);
                  setSelectedDispenser(dispenser || null);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              >
                <option value="">Select dispenser...</option>
                {instruments
                  .filter(i => i.storagePointId === selectedStoragePoint.id)
                  .map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.serialNumber} ({inst.type})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Meter Readings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meter Opening
              </label>
              <input
                type="number"
                step="0.01"
                value={meterOpening}
                onChange={(e) => {
                  setMeterOpening(e.target.value);
                  setTimeout(calculateQuantity, 0);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meter Closing
              </label>
              <input
                type="number"
                step="0.01"
                value={meterClosing}
                onChange={(e) => {
                  setMeterClosing(e.target.value);
                  setTimeout(calculateQuantity, 0);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (Litres)
            </label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold"
              placeholder="0.00"
            />
          </div>

          {/* Asset Readings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Hour Meter
              </label>
              <input
                type="number"
                step="0.1"
                value={assetHourMeter}
                onChange={(e) => setAssetHourMeter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Odometer
              </label>
              <input
                type="number"
                value={assetOdometer}
                onChange={(e) => setAssetOdometer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                placeholder="0"
              />
            </div>
          </div>

          {/* Full Tank Fill */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="fullTankFill"
              checked={fullTankFill}
              onChange={(e) => setFullTankFill(e.target.checked)}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="fullTankFill" className="text-sm font-medium text-gray-700">
              Full tank fill (for full-tank-to-full-tank method)
            </label>
          </div>

          {/* Cost per Litre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost per Litre (₹)
            </label>
            <input
              type="number"
              step="0.01"
              value={costPerLitre}
              onChange={(e) => setCostPerLitre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
            />
          </div>

          {/* Photo Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Evidence
            </label>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Camera className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">Take Photo of Meter</span>
            </button>
          </div>

          {/* Total Cost */}
          {quantity && costPerLitre && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total Cost</span>
                <span className="text-2xl font-bold text-blue-900">
                  ₹{(parseFloat(quantity) * parseFloat(costPerLitre)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !selectedStoragePoint || !selectedAsset || !quantity}
            className="w-full bg-blue-600 text-white rounded-lg py-4 font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Issuing Fuel...' : 'Issue Fuel'}
          </button>
        </div>
      </div>
    </div>
  );
}
