import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPendingCompanies, getApprovedCompanies, getRejectedCompanies, approveCompany, rejectCompany, suspendCompany, reactivateCompany } from "../../services/adminService";
import { FaCheckCircle, FaTimesCircle, FaBuilding, FaMapMarkerAlt, FaFileAlt, FaRupeeSign, FaExternalLinkAlt, FaImage, FaFilePdf, FaSync, FaClock, FaBan, FaPlay, FaChevronLeft, FaChevronRight, FaStar, FaTruck, FaUsers, FaMinusCircle } from "react-icons/fa";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/common/ConfirmModal";
import ReasonInputModal from "../../components/common/ReasonInputModal";

const isPdfUrl = (url) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  // Check for common PDF indicators in Cloudinary URLs
  return lowerUrl.includes('.pdf') ||
    lowerUrl.includes('/raw/') ||
    lowerUrl.includes('pdf') ||
    lowerUrl.includes('application%2fpdf');
};

// For Cloudinary documents, just use the direct URL
// Modern browsers have native PDF viewers that work with Cloudinary URLs
const getDocViewerUrl = (url) => url;

// Simple download/view - just opens in new tab
// Browser will display PDF inline or download based on content-disposition
const downloadPdf = (url) => {
  window.open(url, '_blank');
};

const ITEMS_PER_PAGE = 5;

const TAB_CONFIG = {
  pending: { label: "Pending", icon: FaClock, color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500" },
  approved: { label: "Approved", icon: FaCheckCircle, color: "text-green-400", bgColor: "bg-green-500/20", borderColor: "border-green-500" },
  suspended: { label: "Suspended", icon: FaBan, color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500" },
  rejected: { label: "Rejected", icon: FaMinusCircle, color: "text-gray-400", bgColor: "bg-white/10", borderColor: "border-white/50" },
};

export default function CompanyApprovals() {
  const [pendingCompanies, setPendingCompanies] = useState([]);
  const [approvedCompanies, setApprovedCompanies] = useState([]);
  const [rejectedCompanies, setRejectedCompanies] = useState([]);
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
      const [pending, approved, rejected] = await Promise.all([
        getPendingCompanies(),
        getApprovedCompanies(),
        getRejectedCompanies()
      ]);
      setPendingCompanies(pending || []);
      setApprovedCompanies(approved || []);
      setRejectedCompanies(rejected || []);
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
        return approvedCompanies.filter(c => c.isActive !== false);
      case "suspended":
        return approvedCompanies.filter(c => c.isActive === false);
      case "rejected":
        return rejectedCompanies;
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
    approved: approvedCompanies.filter(c => c.isActive !== false).length,
    suspended: approvedCompanies.filter(c => c.isActive === false).length,
    rejected: rejectedCompanies.length,
    total: pendingCompanies.length + approvedCompanies.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <FaSync className="animate-spin text-4xl text-indigo-400 mx-auto mb-4" />
          <p className="text-white/60">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">Company Management</h1>
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
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition flex items-center gap-2 border border-white/20"
              >
                <FaChevronLeft />
                Dashboard
              </Link>
            </div>
          </div>
          <p className="text-white/60">Review registrations, manage approvals, and monitor company status</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <StatCard label="Total Companies" value={stats.total} color="text-blue-600" icon={FaBuilding} />
          <StatCard label="Pending" value={stats.pending} color="text-yellow-600" icon={FaClock} highlight={stats.pending > 0} />
          <StatCard label="Approved" value={stats.approved} color="text-green-600" icon={FaCheckCircle} />
          <StatCard label="Suspended" value={stats.suspended} color="text-red-600" icon={FaBan} />
          <StatCard label="Rejected" value={stats.rejected} color="text-gray-600" icon={FaMinusCircle} />
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 mb-6">
          <div className="flex border-b border-white/10">
            {Object.entries(TAB_CONFIG).map(([key, config]) => {
              const count = stats[key] || 0;
              const TabIcon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 py-4 px-6 text-sm font-medium transition flex items-center justify-center gap-2 ${activeTab === key
                    ? `${config.color} border-b-2 ${config.borderColor} bg-white/5`
                    : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                >
                  <TabIcon />
                  {config.label}
                  <span className={`${activeTab === key ? config.bgColor : "bg-white/10"} px-2 py-0.5 rounded-full text-xs`}>
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
                    <FaClock className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">All Caught Up!</h3>
                    <p className="text-white/50">No pending company approvals at the moment.</p>
                  </>
                ) : activeTab === "suspended" ? (
                  <>
                    <FaBan className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Suspended Companies</h3>
                    <p className="text-white/50">All approved companies are currently active.</p>
                  </>
                ) : activeTab === "rejected" ? (
                  <>
                    <FaMinusCircle className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Rejected Companies</h3>
                    <p className="text-white/50">No companies have been rejected.</p>
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Approved Companies</h3>
                    <p className="text-white/50">Approve pending companies to see them here.</p>
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
                <p className="text-sm text-white/60">
                  Showing {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, displayCompanies.length)} of {displayCompanies.length} companies
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/20 border border-white/20"
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
                          ? "bg-indigo-600 text-white"
                          : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white/10 text-white hover:bg-white/20 border border-white/20"
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
    <div className={`bg-white/10 backdrop-blur-xl rounded-xl p-5 border ${highlight ? "border-yellow-500/50 ring-2 ring-yellow-500/20" : "border-white/20"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-white/60 mt-1">{label}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${highlight ? "bg-yellow-500/20" : "bg-white/10"} flex items-center justify-center`}>
          <Icon className={`text-lg ${color}`} />
        </div>
      </div>
    </div>
  );
}

function CompanyCard({ company, activeTab, expanded, onToggleExpand, onApprove, onReject, onSuspend, onReactivate, processing }) {
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {company.companyLogoUrl ? (
              <img src={company.companyLogoUrl} alt={company.companyName} className="w-16 h-16 rounded-lg object-cover border border-white/20" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-indigo-400">{company.companyName?.charAt(0) || "C"}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white mb-1">{company.companyName}</h3>
            <p className="text-sm text-white/60 mb-2">
              {company.contactPersonName || "N/A"} • {company.email}
            </p>
            {activeTab === "approved" && (
              <div className="flex items-center gap-4 text-sm text-white/60 mb-2">
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
            <div className="flex flex-wrap gap-2 text-xs text-white/50">
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
            className="px-3 py-1.5 text-sm text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition flex items-center gap-1"
          >
            {expanded ? "Hide Details" : "View Details"}
            <FaChevronRight className={`transform transition ${expanded ? "rotate-90" : ""}`} />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                <FaMapMarkerAlt /> Address
              </h4>
              <p className="text-sm text-white/60">{company.address || "N/A"}</p>
              <p className="text-sm text-white/60">{company.city}, {company.state} - {company.pincode}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                <FaRupeeSign /> Pricing
              </h4>
              <p className="text-sm text-white/60">Rate/KM: ₹{company.baseRatePerKm || "N/A"}</p>
              <p className="text-sm text-white/60">Rate/KG: ₹{company.baseRatePerKg || "N/A"}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-1">
                <FaFileAlt /> Documents
              </h4>
              <div className="flex flex-wrap gap-2">
                {company.companyLogoUrl && (
                  <a href={company.companyLogoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                    <FaImage /> Logo
                  </a>
                )}
                {company.registrationCertificateUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={company.registrationCertificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      title="View in new tab"
                    >
                      <FaFilePdf /> Reg Cert
                    </a>
                    <button
                      onClick={() => downloadPdf(company.registrationCertificateUrl)}
                      className="text-xs text-white/50 hover:text-indigo-400"
                      title="Open in new tab"
                    >
                      ↓
                    </button>
                  </div>
                )}
                {company.gstCertificateUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={company.gstCertificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      title="View in new tab"
                    >
                      <FaFilePdf /> GST Cert
                    </a>
                    <button
                      onClick={() => downloadPdf(company.gstCertificateUrl)}
                      className="text-xs text-white/50 hover:text-indigo-400"
                      title="Open in new tab"
                    >
                      ↓
                    </button>
                  </div>
                )}
              </div>
            </div>

            {company.serviceCities && company.serviceCities.length > 0 && (
              <div className="col-span-full">
                <h4 className="text-sm font-semibold text-white mb-2">Service Cities</h4>
                <div className="flex flex-wrap gap-2">
                  {company.serviceCities.map((city, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white/5 px-4 py-3 border-t border-white/10 flex items-center justify-end gap-2">
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