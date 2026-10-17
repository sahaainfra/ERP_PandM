/**
 * Part 24 — Report Catalogue Browser
 */

import React, { useState, useEffect } from 'react';
import { listReportDefinitions } from '../services/reportEngine';
import { ReportDefinition, ReportCategory } from '../services/reportTypes';
import { FileText, Download, Calendar, Filter } from 'lucide-react';

export default function ReportCatalogue() {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const reportList = await listReportDefinitions();
      setReports(reportList);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (selectedCategory !== 'all' && report.category !== selectedCategory) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.name.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        report.code.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const getCategoryLabel = (category: ReportCategory): string => {
    const labels: Record<ReportCategory, string> = {
      assets: 'Assets',
      operations: 'Operations',
      fuel: 'Fuel',
      maintenance: 'Maintenance',
      rmc_production: 'RMC Production',
      quality: 'Quality',
      dispatch: 'Dispatch',
      finance: 'Finance',
      management: 'Management',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: ReportCategory): string => {
    const colors: Record<ReportCategory, string> = {
      assets: 'bg-blue-100 text-blue-800',
      operations: 'bg-green-100 text-green-800',
      fuel: 'bg-amber-100 text-amber-800',
      maintenance: 'bg-orange-100 text-orange-800',
      rmc_production: 'bg-purple-100 text-purple-800',
      quality: 'bg-cyan-100 text-cyan-800',
      dispatch: 'bg-indigo-100 text-indigo-800',
      finance: 'bg-emerald-100 text-emerald-800',
      management: 'bg-rose-100 text-rose-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Report Catalogue
        </h1>
        <p className="text-gray-600 mt-1">
          Browse and generate reports from all modules
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.keys(getCategoryLabel).map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryLabel(cat as ReportCategory)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <div
            key={report.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {report.name}
                  </h3>
                  <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${getCategoryColor(report.category)}`}>
                    {getCategoryLabel(report.category)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">v{report.version}</span>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {report.description}
              </p>

              <div className="space-y-2 text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Source: {report.sourceModules.join(', ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span>{report.availableFilters.length} filters available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Export: {report.supportedFormats.join(', ').toUpperCase()}</span>
                </div>
              </div>

              <button
                onClick={() => window.location.href = `/reports/${report.id}`}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Report
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No reports found</p>
        </div>
      )}
    </div>
  );
}
