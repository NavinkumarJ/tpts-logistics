import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPendingCompanies, getApprovedCompanies, approveCompany, rejectCompany, suspendCompany, reactivateCompany } from "../../services/adminService";
import { FaCheckCircle, FaTimesCircle, FaBuilding, FaMapMarkerAlt, FaFileAlt, FaRupeeSign, FaExternalLinkAlt, FaImage, FaFilePdf, FaSync, FaClock, FaBan, FaPlay, FaChevronLeft, FaChevronRight, FaStar, FaTruck, FaUsers } from "react-icons/fa";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import ReasonInputModal from "../../components/common/ReasonInputModal";

const isPdfUrl = (url) => {
  if (!url) return false;
  return url.toLowerCase().includes('.pdf') || url.includes('/raw/');
};

const getDocViewerUrl = (url) => url;

const downloadPdf = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || url.split('/').pop() || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    window.open(url, '_blank');
    return false;
  }
};

const ITEMS_PER_PAGE = 5;

const TAB_CONFIG = {
  pending: { label: "Pending", icon: FaClock, color: "text-yellow-600", bgColor: "bg-yellow-100" },
  approved: { label: "Approved", icon: FaCheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
  suspended: { label: "Suspended", icon: FaBan, color: "text-red-600", bgColor: "bg-red-100" },
};

export default function CompanyApprovals() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [approvedCompanies, setApprovedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalConfig, setModalConfig] = useState({
    type: null,
    companyId: null,
    companyName: null
  });

  useEffect(() => {
    fetchAllCompanies();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [activeTab]);

  const fetchAllCompanies = async () => {
    setLoading(true);
    try {
      const [pending, approved] = await Promise.all([
        getPendingCompanies(),
        getApprovedCompanies()
      ]);
      setPendingCompanies(pending || []);
      setApprovedCompanies(approved || []);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (companyId, companyName) => {
    setModalConfig({ type: 'approve', companyId, companyName });
  };

  const confirmApprove = async () => {
    const { companyId } = modalConfig;
    setModalConfig({ type: null, companyId: null, companyName: null });
    setProcessing(companyId);
    try {
      await approveCompany(companyId);
      toast.success("Company approved successfully!");
      fetchAllCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve company");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (companyId, companyName) => {
    setModalConfig({ type: 'reject', companyId, companyName });
  };

  const confirmReject = async (reason) => {
    const { companyId } = modalConfig;
    setModalConfig({ type: null, companyId: null, companyName: null });
    setProcessing(companyId);
    try {
      await rejectCompany(companyId, { reason });
      toast.success("Company rejected");
      fetchAllCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject company");
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = async (companyId, companyName) => {
    setModalConfig({ type: 'suspend', companyId, companyName });
  };

  const confirmSuspend = async (reason) => {
    const { companyId } = modalConfig;
    setModalConfig({ type: null, companyId: null, companyName: null });
    setProcessing(companyId);
    try {
      await suspendCompany(companyId, reason);
      toast.success("Company suspended");
      fetchAllCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to suspend company");
    } finally {
      setProcessing(null);
    }
  };

  const handleReactivate = async (companyId, companyName) => {
    setModalConfig({ type: 'reactivate', companyId, companyName });
  };

  const confirmReactivate = async () => {
    const { companyId } = modalConfig;
    setModalConfig({ type: null, companyId: null, companyName: null });
    setProcessing(companyId);
    try {
      await reactivateCompany(companyId);
      toast.success("Company reactivated");
      fetchAllCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reactivate company");
    } finally {
      setProcessing(null);
    }
  };

  const closeModal = () => {
    setModalConfig({ type: null, companyId: null, companyName: null });
  };

  const getDisplayCompanies = () => {
    switch (activeTab) {
      case "pending":
        return pendingCompanies;
      case "approved":
        return approvedCompanies.filter(c => c.isVerified !== false);
      case "suspended":
        return approvedCompanies.filter(c => c.isVerified === false);
      default:
        return pendingCompanies;
    }
  };

  const displayCompanies = getDisplayCompanies();
  const totalPages = Math.ceil(displayCompanies.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompanies = displayCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const stats = {
    pending: pendingCompanies.length,
    approved: approvedCompanies.filter(c => c.isVerified !== false).length,
    suspended: approvedCompanies.filter(c => c.isVerified === false).length,
    total: pendingCompanies.length + approvedCompanies.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FaSync className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
            <div className="flex gap-3">
              <button
                onClick={fetchAllCompanies}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
              >
                <FaSync className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
              <Link
                to="/admin/dashboard"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                <FaChevronLeft />
                Dashboard
              </Link>
            </div>
          </div>
          <p className="text-gray-600">Review registrations, manage approvals, and monitor company status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Companies" value={stats.total} color="text-blue-600" icon={FaBuilding} />
          <StatCard label="Pending" value={stats.pending} color="text-yellow-600" icon={FaClock} highlight={stats.pending > 0} />
          <StatCard label="Approved" value={stats.approved} color="text-green-600" icon={FaCheckCircle} />
          <StatCard label="Suspended" value={stats.suspended} color="text-red-600" icon={FaBan} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border mb-6">
          <div className="flex border-b">
            {Object.entries(TAB_CONFIG).map(([key, config]) => {
              const count = key === "pending" ? stats.pending : key === "approved" ? stats.approved : stats.suspended;
              const TabIcon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === key
                    ? `${config.color} border-b-2 border-current bg-gray-50`
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  <TabIcon />
                  {config.label}
                  <span className={`${activeTab === key ? config.bgColor : "bg-gray-200"} px-2 py-0.5 rounded-full text-xs`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {paginatedCompanies.length === 0 ? (
              <div className="text-center py-12">
                {activeTab === "pending" ? (
                  <>
                    <FaClock className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">All Caught Up!</h3>
                    <p className="text-gray-500">No pending company approvals at the moment.</p>
                  </>
                ) : activeTab === "suspended" ? (
                  <>
                    <FaBan className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Suspended Companies</h3>
                    <p className="text-gray-500">All approved companies are currently active.</p>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No Approved Companies</h3>
                    <p className="text-gray-500">Approve pending companies to see them here.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    activeTab={activeTab}
                    expanded={expandedId === company.id}
                    onToggleExpand={() => setExpandedId(expandedId === company.id ? null : company.id)}
                    onApprove={() => handleApprove(company.id, company.companyName)}
                    onReject={() => handleReject(company.id, company.companyName)}
                    onSuspend={() => handleSuspend(company.id, company.companyName)}
                    onReactivate={() => handleReactivate(company.id, company.companyName)}
                    processing={processing === company.id}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, displayCompanies.length)} of {displayCompanies.length} companies
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    <FaChevronLeft />
                    Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded text-sm font-medium transition ${currentPage === pageNum
                          ? "bg-slate-700 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Next
                    <FaChevronRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={modalConfig.type === 'approve'}
        onClose={closeModal}
        onConfirm={confirmApprove}
        title="Approve Company"
        message={`Are you sure you want to approve ${modalConfig.companyName}? This will allow them to access the platform.`}
        confirmText="Yes, Approve"
        variant="success"
      />

      <ReasonInputModal
        isOpen={modalConfig.type === 'reject'}
        onClose={closeModal}
        onSubmit={confirmReject}
        title="Reject Company"
        subtitle={`Please provide a reason for rejecting ${modalConfig.companyName}:`}
        submitText="Reject Company"
        variant="danger"
      />

      <ReasonInputModal
        isOpen={modalConfig.type === 'suspend'}
        onClose={closeModal}
        onSubmit={confirmSuspend}
        title="Suspend Company"
        subtitle={`Please provide a reason for suspending ${modalConfig.companyName}:`}
        submitText="Suspend Company"
        variant="warning"
      />

      <ConfirmModal
        isOpen={modalConfig.type === 'reactivate'}
        onClose={closeModal}
        onConfirm={confirmReactivate}
        title="Reactivate Company"
        message={`Are you sure you want to reactivate ${modalConfig.companyName}?`}
        confirmText="Yes, Reactivate"
        variant="reactivate"
      />
    </>
  );
}

function StatCard({ label, value, color, icon: Icon, highlight = false }) {
  return (
    <div className={`bg-white rounded-xl p-5 shadow-sm border ${highlight ? "border-yellow-300 ring-2 ring-yellow-100" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{label}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${highlight ? "bg-yellow-100" : "bg-gray-100"} mx-auto mb-2 flex items-center justify-center`}>
          <Icon className={`${color}`} />
        </div>
      </div>
    </div>
  );
}

function CompanyCard({ company, activeTab, expanded, onToggleExpand, onApprove, onReject, onSuspend, onReactivate, processing }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {company.companyLogoUrl ? (
              <img src={company.companyLogoUrl} alt={company.companyName} className="w-16 h-16 rounded-lg object-cover border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-600">{company.companyName?.charAt(0) || "C"}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{company.companyName}</h3>
            <p className="text-sm text-gray-600 mb-2">
              {company.contactPersonName || "N/A"} • {company.email}
            </p>
            {activeTab === "approved" && (
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  {company.ratingAvg && (
                    <>
                      <FaStar className="text-yellow-400" />
                      {Number(company.ratingAvg).toFixed(1)}
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <FaTruck />
                  {company.totalDeliveries || 0} deliveries
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <FaMapMarkerAlt /> {company.city}, {company.state}
              </span>
              <span className="flex items-center gap-1">
                <FaFileAlt /> GST: {company.gstNumber || "N/A"}
              </span>
              <span className="flex items-center gap-1">
                <FaFileAlt /> Reg: {company.registrationNumber || "N/A"}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleExpand}
            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1"
          >
            {expanded ? "Hide Details" : "View Details"}
            <FaChevronRight className={`transform transition ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <FaMapMarkerAlt /> Address
              </h4>
              <p className="text-sm text-gray-600">{company.address || "N/A"}</p>
              <p className="text-sm text-gray-600">{company.city}, {company.state} - {company.pincode}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <FaRupeeSign /> Pricing
              </h4>
              <p className="text-sm text-gray-600">Rate/KM: ₹{company.baseRatePerKm || "N/A"}</p>
              <p className="text-sm text-gray-600">Rate/KG: ₹{company.baseRatePerKg || "N/A"}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <FaFileAlt /> Documents
              </h4>
              <div className="flex flex-wrap gap-2">
                {company.companyLogoUrl && (
                  <a href={company.companyLogoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <FaImage /> Logo
                  </a>
                )}
                {company.registrationCertificateUrl && (
                  isPdfUrl(company.registrationCertificateUrl) ? (
                    <button
                      onClick={() => downloadPdf(company.registrationCertificateUrl, 'registration_certificate.pdf')}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <FaFilePdf /> Reg Cert ↓
                    </button>
                  ) : (
                    <a href={company.registrationCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                      <FaFilePdf /> Reg Cert
                    </a>
                  )
                )}
                {company.gstCertificateUrl && (
                  isPdfUrl(company.gstCertificateUrl) ? (
                    <button
                      onClick={() => downloadPdf(company.gstCertificateUrl, 'gst_certificate.pdf')}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <FaFilePdf /> GST Cert ↓
                    </button>
                  ) : (
                    <a href={company.gstCertificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                      <FaFilePdf /> GST Cert
                    </a>
                  )
                )}
              </div>
            </div>

            {company.serviceCities && company.serviceCities.length > 0 && (
              <div className="col-span-full">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Service Cities</h4>
                <div className="flex flex-wrap gap-2">
                  {company.serviceCities.map((city, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white px-4 py-3 border-t flex items-center justify-end gap-2">
        {activeTab === "pending" && (
          <>
            <button
              onClick={onApprove}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <FaCheckCircle />
              {processing ? "Processing..." : "Approve"}
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              <FaTimesCircle />
              Reject
            </button>
          </>
        )}

        {activeTab === "approved" && (
          <button
            onClick={onSuspend}
            disabled={processing}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <FaBan />
            {processing ? "Processing..." : "Suspend Company"}
          </button>
        )}

        {activeTab === "suspended" && (
          <button
            onClick={onReactivate}
            disabled={processing}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            <FaPlay />
            {processing ? "Processing..." : "Reactivate Company"}
          </button>
        )}
      </div>
    </div>
  );
}