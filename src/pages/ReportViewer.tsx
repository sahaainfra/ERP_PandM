/**
 * Part 24 — Report Viewer
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReportDefinition, executeReport } from '../services/reportEngine';
import { createExportJob } from '../services/exportService';
import { ReportDefinition, ReportExecution } from '../services/reportTypes';
import { format } from 'date-fns';
import { FileText, Download, Filter, ArrowLeft, Loader } from 'lucide-react';

export default function ReportViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportDefinition | null>(null);
  const [execution, setExecution] = useState<ReportExecution | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) {
      loadReport();
    }
  }, [id]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const reportDef = await getReportDefinition(id!);
      if (reportDef) {
        setReport(reportDef);
        setFilters(reportDef.defaultFilters);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!report) return;

    setExecuting(true);
    try {
      const result = await executeReport(report.id, filters, 'current_user');
      setExecution(result);
    } catch (error) {
      console.error('Failed to execute report:', error);
      alert('Failed to execute report: ' + (error as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!report || !execution) return;

    setExporting(true);
    try {
      const job = await createExportJob({
        reportId: report.id,
        executionId: execution.id,
        format,
        requestedBy: 'current_user',
      });

      alert(`Export job created: ${job.fileName}\nYou will be notified when it's ready.`);
    } catch (error) {
      console.error('Failed to create export job:', error);
      alert('Failed to export: ' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters({ ...filters, [filterId]: value });
  };

  const renderFilterInput = (filter: any) => {
    const value = filters[filter.id] || filter.defaultValue || '';

    switch (filter.type) {
      case 'date_range':
        return (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={value?.startDate || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={value?.endDate || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        );

      case 'single_select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {filter.options?.map((opt: string) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'multi_select':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {filter.options?.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v: string) => v !== opt);
                    handleFilterChange(filter.id, newValues);
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={filter.name}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={filter.name}
          />
        );

      default:
        return null;
    }
  };

  const renderCellValue = (value: any, column: any) => {
    if (value === null || value === undefined) return '—';

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(value);

      case 'percentage':
        return `${value.toFixed(1)}%`;

      case 'date':
        return format(new Date(value), 'dd MMM yyyy');

      case 'status':
        const statusColors: Record<string, string> = {
          approved: 'bg-green-100 text-green-800',
          pending: 'bg-amber-100 text-amber-800',
          rejected: 'bg-red-100 text-red-800',
          submitted: 'bg-blue-100 text-blue-800',
        };
        return (
          <span className={`px-2 py-1 text-xs font-medium rounded ${statusColors[value] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );

      default:
        return value;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Report not found</p>
          <button
            onClick={() => navigate('/reports')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Report Catalogue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{report.name}</h1>
        <p className="text-gray-600 mt-1">{report.description}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {report.availableFilters.map((filter) => (
            <div key={filter.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {filter.name}
                {filter.required && <span className="text-red-600 ml-1">*</span>}
              </label>
              {renderFilterInput(filter)}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {executing ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Report'
            )}
          </button>
          <button
            onClick={() => setFilters(report.defaultFilters)}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Results */}
      {execution && (
        <>
          {/* Report Header */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Report ID</p>
                <p className="font-medium text-gray-900">{report.code}</p>
              </div>
              <div>
                <p className="text-gray-600">Version</p>
                <p className="font-medium text-gray-900">v{execution.reportVersion}</p>
              </div>
              <div>
                <p className="text-gray-600">Generated</p>
                <p className="font-medium text-gray-900">
                  {format(new Date(execution.generatedAt), 'dd MMM yyyy HH:mm')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Rows</p>
                <p className="font-medium text-gray-900">{execution.totalRows}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-gray-600">
                Data Sources: {execution.dataSources.join(', ')} | 
                Execution Time: {execution.executionTimeMs}ms
              </p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700">Export Report</h3>
              <div className="flex gap-2">
                {report.supportedFormats.includes('pdf') && (
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    PDF
                  </button>
                )}
                {report.supportedFormats.includes('excel') && (
                  <button
                    onClick={() => handleExport('excel')}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 text-sm"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    Excel
                  </button>
                )}
                {report.supportedFormats.includes('csv') && (
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={exporting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                  >
                    <Download className="w-4 h-4 inline mr-1" />
                    CSV
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {report.columns.filter(col => col.visible).map((column) => (
                      <th
                        key={column.id}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {execution.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {report.columns.filter(col => col.visible).map((column) => (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renderCellValue(row[column.field], column)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {execution.data.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No data found for the selected filters</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
