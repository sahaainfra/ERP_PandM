import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, FileText, Award, Shield, Calendar } from 'lucide-react';
import { getOperator, checkExpiringDocuments } from '../services/operatorManagement';
import { Operator } from '../services/assetLifecycleTypes';

export default function OperatorProfile() {
  const { id } = useParams<{ id: string }>();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [expiringOperators, setExpiringOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const operatorData = await getOperator(id!);
      setOperator(operatorData);
      const expiring = await checkExpiringDocuments(30);
      setExpiringOperators(expiring);
    } catch (error) {
      console.error('Failed to load operator', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading operator...</div>
      </div>
    );
  }

  if (!operator) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Operator not found</p>
          <Link to="/operators" className="text-blue-600 hover:text-blue-900 mt-4 inline-block">
            ← Back to Operators
          </Link>
        </div>
      </div>
    );
  }

  const hasExpiringDocs = expiringOperators.some(o => o.id === operator.id);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/operators" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Operators
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{operator.fullName}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded ${
                operator.status === 'active' ? 'bg-green-100 text-green-800' :
                operator.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                operator.status === 'suspended' ? 'bg-red-100 text-red-800' :
                'bg-gray-200 text-gray-900'
              }`}>
                {operator.status}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {operator.type === 'internal' ? 'Internal Employee' : 
               operator.type === 'subcontractor' ? 'Subcontractor' : 'Hired'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {operator.contactPhone} {operator.contactEmail && `• ${operator.contactEmail}`}
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <FileText className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {hasExpiringDocs && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Documents Expiring Soon</h3>
              <p className="text-sm text-yellow-800 mt-1">
                This operator has documents expiring within 30 days
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identity & Contact */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity & Contact</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Full Name</dt>
              <dd className="text-sm text-gray-900">{operator.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900 capitalize">{operator.type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">{operator.contactPhone}</dd>
            </div>
            {operator.contactEmail && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{operator.contactEmail}</dd>
              </div>
            )}
            {operator.address && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="text-sm text-gray-900">{operator.address}</dd>
              </div>
            )}
            {operator.employeeId && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Employee ID</dt>
                <dd className="text-sm text-gray-900">{operator.employeeId}</dd>
              </div>
            )}
            {operator.vendorId && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Vendor ID</dt>
                <dd className="text-sm text-gray-900">{operator.vendorId}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Driving Licence */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Driving Licence
          </h3>
          <dl className="space-y-3">
            {operator.licenceNumber && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Licence Number</dt>
                <dd className="text-sm text-gray-900">{operator.licenceNumber}</dd>
              </div>
            )}
            {operator.licenceClass && operator.licenceClass.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Licence Class</dt>
                <dd className="text-sm text-gray-900">{operator.licenceClass.join(', ')}</dd>
              </div>
            )}
            {operator.licenceIssueDate && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Issue Date</dt>
                <dd className="text-sm text-gray-900">{new Date(operator.licenceIssueDate).toLocaleDateString()}</dd>
              </div>
            )}
            {operator.licenceExpiryDate && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(operator.licenceExpiryDate).toLocaleDateString()}
                  {new Date(operator.licenceExpiryDate) < new Date() && (
                    <span className="ml-2 text-red-600 text-xs">Expired</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Certificates */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Certificates ({operator.certificates.length})
          </h3>
          {operator.certificates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No certificates added
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Number</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issued By</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operator.certificates.map(cert => {
                    const expiryDate = new Date(cert.expiryDate);
                    const isExpired = expiryDate < new Date();
                    const isExpiring = !isExpired && expiryDate.getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

                    return (
                      <tr key={cert.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-900">{cert.type}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{cert.certificateNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{cert.issuedBy}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{new Date(cert.issueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{expiryDate.toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          {isExpired ? (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">Expired</span>
                          ) : isExpiring ? (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Expiring
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Competencies */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Competencies ({operator.competencies.length})
          </h3>
          {operator.competencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No competencies recorded
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {operator.competencies.map(comp => (
                <div key={comp.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 capitalize">{comp.assetCategory.replace('_', ' ')}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      comp.competencyLevel === 'expert' ? 'bg-purple-100 text-purple-800' :
                      comp.competencyLevel === 'advanced' ? 'bg-blue-100 text-blue-800' :
                      comp.competencyLevel === 'intermediate' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {comp.competencyLevel}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Assessed: {new Date(comp.assessedDate).toLocaleDateString()} by {comp.assessedBy}
                  </div>
                  {comp.validUntil && (
                    <div className="text-xs text-gray-500 mt-1">
                      Valid until: {new Date(comp.validUntil).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Training */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Inductions ({operator.inductions.length})
          </h3>
          {operator.inductions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No inductions recorded</div>
          ) : (
            <div className="space-y-2">
              {operator.inductions.map(training => (
                <div key={training.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{training.type}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Completed: {new Date(training.completedDate).toLocaleDateString()} by {training.conductedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Safety Training ({operator.safetyTraining.length})
          </h3>
          {operator.safetyTraining.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No safety training recorded</div>
          ) : (
            <div className="space-y-2">
              {operator.safetyTraining.map(training => (
                <div key={training.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="font-medium text-gray-900">{training.type}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Completed: {new Date(training.completedDate).toLocaleDateString()} by {training.conductedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
