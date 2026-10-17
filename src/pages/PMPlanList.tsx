/**
 * Part 11 — PM Plan List
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPMPlans, getPMStatistics, checkPMDueStatus } from '../services/pmPlanService';
import { PMPlan } from '../services/maintenanceTypes';
import { format, differenceInDays } from 'date-fns';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PMPlanList() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PMPlan[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [dueStatus, setDueStatus] = useState<{ dueSoon: PMPlan[]; overdue: PMPlan[] }>({ dueSoon: [], overdue: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [planList, stats, due] = await Promise.all([
        listPMPlans(),
        getPMStatistics(),
        checkPMDueStatus(),
      ]);
      setPlans(planList);
      setStatistics(stats);
      setDueStatus(due);
    } catch (error) {
      console.error('Failed to load PM plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntervalDisplay = (plan: PMPlan) => {
    switch (plan.intervalType) {
      case 'hours':
        return `${plan.intervalValue} hours`;
      case 'kilometres':
        return `${plan.intervalValue.toLocaleString()} km`;
      case 'calendar_days':
        return `${plan.intervalValue} days`;
      default:
        return 'Unknown';
    }
  };

  const getDueStatusDisplay = (plan: PMPlan) => {
    if (!plan.nextDueDate) {
      return <span className="text-gray-500">Not scheduled</span>;
    }

    const dueDate = new Date(plan.nextDueDate);
    const daysUntilDue = differenceInDays(dueDate, new Date());

    if (daysUntilDue < 0) {
      return (
        <span className="flex items-center gap-1 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          Overdue by {Math.abs(daysUntilDue)} days
        </span>
      );
    } else if (daysUntilDue <= 7) {
      return (
        <span className="flex items-center gap-1 text-orange-600">
          <Clock className="w-4 h-4" />
          Due in {daysUntilDue} days
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          Due in {daysUntilDue} days
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading PM plans...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance Plans</h1>
            <p className="text-gray-600 mt-1">Manage scheduled maintenance plans for assets</p>
          </div>
          <button
            onClick={() => navigate('/maintenance/pm-plans/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4" />
            New PM Plan
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Plans</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalPlans}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-sm text-green-700">Active Plans</p>
            <p className="text-2xl font-bold text-green-900">{statistics.activePlans}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <p className="text-sm text-blue-700">Scheduled</p>
            <p className="text-2xl font-bold text-blue-900">{statistics.scheduledWorkOrders}</p>
          </div>
          <div className="bg-purple-50 rounded-lg shadow p-4 border border-purple-200">
            <p className="text-sm text-purple-700">Completed</p>
            <p className="text-2xl font-bold text-purple-900">{statistics.completedWorkOrders}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <p className="text-sm text-yellow-700">Compliance</p>
            <p className="text-2xl font-bold text-yellow-900">{statistics.complianceRate}%</p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {(dueStatus.overdue.length > 0 || dueStatus.dueSoon.length > 0) && (
        <div className="mb-6 space-y-3">
          {dueStatus.overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900">Overdue PM Plans</h3>
                  <p className="text-sm text-red-800 mt-1">
                    {dueStatus.overdue.length} plan(s) are overdue and require immediate attention
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dueStatus.overdue.slice(0, 3).map(plan => (
                      <button
                        key={plan.id}
                        onClick={() => navigate(`/maintenance/pm-plans/${plan.id}`)}
                        className="text-xs bg-red-100 text-red-900 px-2 py-1 rounded hover:bg-red-200"
                      >
                        {plan.make} {plan.model}
                      </button>
                    ))}
                    {dueStatus.overdue.length > 3 && (
                      <span className="text-xs text-red-700">+{dueStatus.overdue.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {dueStatus.dueSoon.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-900">PM Plans Due Soon</h3>
                  <p className="text-sm text-orange-800 mt-1">
                    {dueStatus.dueSoon.length} plan(s) are due within the next 7 days
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PM Plans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset / Make-Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Interval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Checklist
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Performed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Due
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.map((plan) => (
                <tr key={plan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {plan.assetId ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">Asset: {plan.assetId}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{plan.make} {plan.model}</div>
                        <div className="text-xs text-gray-500 capitalize">{plan.assetCategory}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getIntervalDisplay(plan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plan.checklistTemplateName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.lastPerformedDate ? (
                      <div>
                        <div>{format(new Date(plan.lastPerformedDate), 'dd MMM yyyy')}</div>
                        {plan.lastPerformedMeterReading && (
                          <div className="text-xs text-gray-400">
                            {plan.intervalType === 'hours' 
                              ? `${plan.lastPerformedMeterReading} hrs`
                              : `${plan.lastPerformedMeterReading.toLocaleString()} km`
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getDueStatusDisplay(plan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      plan.status === 'active' ? 'bg-green-100 text-green-800' :
                      plan.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/maintenance/pm-plans/${plan.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No PM plans found</p>
          </div>
        )}
      </div>
    </div>
  );
}
