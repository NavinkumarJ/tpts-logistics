import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    getCompanyApplications,
    reviewApplication,
    hireApplicant
} from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUserPlus, FaCheck, FaTimes, FaCalendar, FaPhone,
    FaEnvelope, FaMotorcycle, FaClock, FaEye, FaChevronDown,
    FaChevronUp, FaMapMarkerAlt, FaIdCard, FaFileAlt,
    FaBriefcase, FaRupeeSign, FaExternalLinkAlt, FaImage,
    FaCar, FaUser, FaSync, FaSearch
} from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const STATUS_CONFIG = {
    PENDING: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
    SHORTLISTED: { label: "Shortlisted", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    UNDER_REVIEW: { label: "Under Review", bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    INTERVIEW_SCHEDULED: { label: "Interview", bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
    APPROVED: { label: "Approved", bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
    REJECTED: { label: "Rejected", bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    HIRED: { label: "Hired", bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
    WITHDRAWN: { label: "Withdrawn", bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
};

const ITEMS_PER_PAGE = 8;

const isPdfUrl = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf') || url.includes('/raw/');
};

// Just return the URL directly - DocLink handles download behavior
const getDocViewerUrl = (url) => url;

export default function ApplicationsPage() {
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedApp, setExpandedApp] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchApplications();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filter or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, searchQuery]);

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const data = await getCompanyApplications();
            setApplications(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load applications");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReview = async (appId, status, additionalData = {}) => {
        setProcessing(true);
        try {
            await reviewApplication(appId, { status, ...additionalData });
            toast.success(`Application ${status.toLowerCase().replace('_', ' ')}`);
            setShowRejectModal(null);
            setRejectReason("");
            fetchApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update application");
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = (appId) => {
        if (!rejectReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }
        handleReview(appId, "REJECTED", { rejectionReason: rejectReason });
    };

    const handleHire = async (appId) => {
        if (!confirm("Hire this applicant? This will create an agent account for them.")) return;
        setProcessing(true);
        try {
            await hireApplicant(appId);
            toast.success("Applicant hired! Agent account created.");
            fetchApplications();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to hire applicant");
        } finally {
            setProcessing(false);
        }
    };

    // Filter and search
    const filteredApps = applications.filter(app => {
        const matchesFilter = filter === "all" || app.status === filter;
        const matchesSearch = !searchQuery ||
            app.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.applicantEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.applicantPhone?.includes(searchQuery);
        return matchesFilter && matchesSearch;
    });

    // Pagination
    const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);
    const paginatedApps = filteredApps.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const getStatusBadge = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
                {config.label}
            </span>
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const toggleExpand = (appId) => {
        setExpandedApp(expandedApp === appId ? null : appId);
    };

    // Stats
    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === "PENDING").length,
        approved: applications.filter(a => a.status === "APPROVED").length,
        hired: applications.filter(a => a.status === "HIRED").length,
        rejected: applications.filter(a => a.status === "REJECTED").length,
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 rounded-xl">
                        <FaUserPlus className="text-2xl text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Hiring Management</h1>
                        <p className="text-sm text-gray-500">Review and manage delivery agent applications</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchApplications}
                        disabled={loading}
                        className="btn-outline flex items-center gap-2"
                    >
                        <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <Link
                        to="/company/settings"
                        className="btn-primary flex items-center gap-2"
                    >
                        ⚙️ Hiring Settings
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    label="Total"
                    value={stats.total}
                    icon={FaFileAlt}
                    color="gray"
                    active={filter === "all"}
                    onClick={() => setFilter("all")}
                />
                <StatCard
                    label="Pending"
                    value={stats.pending}
                    icon={FaClock}
                    color="yellow"
                    active={filter === "PENDING"}
                    onClick={() => setFilter("PENDING")}
                />
                <StatCard
                    label="Approved"
                    value={stats.approved}
                    icon={FaCheck}
                    color="green"
                    active={filter === "APPROVED"}
                    onClick={() => setFilter("APPROVED")}
                />
                <StatCard
                    label="Hired"
                    value={stats.hired}
                    icon={FaUserPlus}
                    color="indigo"
                    active={filter === "HIRED"}
                    onClick={() => setFilter("HIRED")}
                />
                <StatCard
                    label="Rejected"
                    value={stats.rejected}
                    icon={FaTimes}
                    color="red"
                    active={filter === "REJECTED"}
                    onClick={() => setFilter("REJECTED")}
                />
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
            </div>

            {/* Applications List */}
            {paginatedApps.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaUserPlus className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications</h3>
                    <p className="text-sm text-gray-500">
                        {filter !== "all"
                            ? `No ${STATUS_CONFIG[filter]?.label.toLowerCase()} applications`
                            : searchQuery ? "No matches found" : "No applications received yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedApps.map((app) => (
                        <ApplicationCard
                            key={app.id}
                            app={app}
                            expanded={expandedApp === app.id}
                            onToggle={() => toggleExpand(app.id)}
                            getStatusBadge={getStatusBadge}
                            formatDate={formatDate}
                            onShortlist={() => handleReview(app.id, "SHORTLISTED")}
                            onApprove={() => handleReview(app.id, "APPROVED")}
                            onReject={() => setShowRejectModal(app.id)}
                            onHire={() => handleHire(app.id)}
                            processing={processing}
                        />
                    ))}

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredApps.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Application</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Please provide a reason for rejection. This will be sent to the applicant.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="input mb-4"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={processing}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium"
                            >
                                {processing ? "Rejecting..." : "Confirm Reject"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason("");
                                }}
                                className="flex-1 btn-outline"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, active, onClick }) {
    const colors = {
        gray: { bg: "bg-gray-50", text: "text-gray-600", activeBg: "bg-gray-100", border: "border-gray-200" },
        yellow: { bg: "bg-yellow-50", text: "text-yellow-600", activeBg: "bg-yellow-100", border: "border-yellow-200" },
        green: { bg: "bg-green-50", text: "text-green-600", activeBg: "bg-green-100", border: "border-green-200" },
        indigo: { bg: "bg-indigo-50", text: "text-indigo-600", activeBg: "bg-indigo-100", border: "border-indigo-200" },
        red: { bg: "bg-red-50", text: "text-red-600", activeBg: "bg-red-100", border: "border-red-200" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 ${active ? `${c.activeBg} ${c.border} ring-2 ring-offset-1 ring-primary-500` : `${c.bg} ${c.border} hover:shadow-md`
                }`}
        >
            <Icon className={`text-xl ${c.text} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${active ? c.text : "text-gray-900"}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </button>
    );
}

function ApplicationCard({ app, expanded, onToggle, getStatusBadge, formatDate, onShortlist, onApprove, onReject, onHire, processing }) {
    return (
        <div className={`bg-white rounded-xl shadow-md border overflow-hidden transition ${app.status === "PENDING" ? "border-l-4 border-l-yellow-500" :
            app.status === "APPROVED" ? "border-l-4 border-l-green-500" :
                app.status === "HIRED" ? "border-l-4 border-l-indigo-500" :
                    "border-gray-200"
            }`}>
            {/* Header - Always Visible */}
            <div className="p-5 cursor-pointer hover:bg-gray-50 transition" onClick={onToggle}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Applicant Info */}
                    <div className="flex items-center gap-4 flex-1">
                        {app.photoUrl ? (
                            <img
                                src={app.photoUrl}
                                alt={app.applicantName}
                                className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xl">
                                {app.applicantName?.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-lg text-gray-900">{app.applicantName}</p>
                                {getStatusBadge(app.status)}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <FaPhone className="text-gray-400 text-xs" /> {app.applicantPhone}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaMotorcycle className="text-gray-400 text-xs" /> {app.vehicleType || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaBriefcase className="text-gray-400 text-xs" /> {app.experienceYears || 0}+ years
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaCalendar className="text-gray-400 text-xs" /> {formatDate(app.appliedAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Expand Toggle */}
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1">
                        {expanded ? <>Hide <FaChevronUp /></> : <>Details <FaChevronDown /></>}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-5">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {/* Personal */}
                        <InfoSection title="Personal" icon={FaUser} color="indigo">
                            <InfoRow label="Email" value={app.applicantEmail} />
                            <InfoRow label="Phone" value={app.applicantPhone} />
                            <InfoRow label="DOB" value={app.dateOfBirth || "N/A"} />
                        </InfoSection>

                        {/* Address */}
                        <InfoSection title="Address" icon={FaMapMarkerAlt} color="red">
                            <InfoRow label="Address" value={app.address || "N/A"} />
                            <InfoRow label="City" value={app.city || "N/A"} />
                            <InfoRow label="State" value={app.state || "N/A"} />
                            <InfoRow label="Pincode" value={app.pincode || "N/A"} />
                        </InfoSection>

                        {/* Vehicle */}
                        <InfoSection title="Vehicle & License" icon={FaCar} color="green">
                            <InfoRow label="Vehicle" value={app.vehicleType || "N/A"} />
                            <InfoRow label="Number" value={app.vehicleNumber || "N/A"} />
                            <InfoRow label="License" value={app.licenseNumber || "N/A"} />
                            <InfoRow label="Expiry" value={app.licenseExpiry || "N/A"} />
                            <InfoRow label="Service Areas" value={app.servicePincodes || "N/A"} />
                        </InfoSection>

                        {/* Experience */}
                        <InfoSection title="Experience" icon={FaBriefcase} color="purple">
                            <InfoRow label="Years" value={app.experienceYears || "N/A"} />
                            <InfoRow label="Previous" value={app.previousEmployer || "N/A"} />
                            <InfoRow label="Expected" value={app.expectedSalary ? `₹${app.expectedSalary.toLocaleString('en-IN')}/month` : "N/A"} />
                        </InfoSection>
                    </div>

                    {/* Preferences & Availability */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FaClock className="text-blue-500" /> Preferences & Availability
                        </h4>
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 text-xs block">Preferred Shifts</span>
                                <span className="font-medium text-gray-900 capitalize">{app.preferredShifts || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs block">Available From</span>
                                <span className="font-medium text-gray-900">{app.availableFrom || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 text-xs block">Weekend Availability</span>
                                <span className={`font-medium ${app.weekendAvailability ? 'text-green-600' : 'text-red-600'}`}>
                                    {app.weekendAvailability ? "✓ Available" : "✗ Not Available"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cover Letter */}
                    {app.coverLetter && (
                        <div className="bg-white rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <FaFileAlt className="text-blue-500" /> Cover Letter
                            </h4>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{app.coverLetter}</p>
                        </div>
                    )}

                    {/* Documents */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FaFileAlt className="text-orange-500" /> Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {app.photoUrl && <DocLink href={app.photoUrl} icon={FaImage} label="Photo" color="blue" />}
                            {app.licenseDocumentUrl && <DocLink href={getDocViewerUrl(app.licenseDocumentUrl)} icon={FaIdCard} label="License" color="green" pdf={isPdfUrl(app.licenseDocumentUrl)} />}
                            {app.aadhaarDocumentUrl && <DocLink href={getDocViewerUrl(app.aadhaarDocumentUrl)} icon={FaIdCard} label="Aadhaar" color="purple" pdf={isPdfUrl(app.aadhaarDocumentUrl)} />}
                            {app.rcDocumentUrl && <DocLink href={getDocViewerUrl(app.rcDocumentUrl)} icon={FaCar} label="RC" color="indigo" pdf={isPdfUrl(app.rcDocumentUrl)} />}
                            {app.vehiclePhotoUrl && <DocLink href={app.vehiclePhotoUrl} icon={FaImage} label="Vehicle Photo" color="green" />}
                            {!app.photoUrl && !app.licenseDocumentUrl && !app.aadhaarDocumentUrl && !app.rcDocumentUrl && (
                                <p className="text-sm text-gray-400">No documents uploaded</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                        {app.status === "PENDING" && (
                            <>
                                <button onClick={onShortlist} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                    <FaCheck /> Shortlist
                                </button>
                                <button onClick={onReject} disabled={processing} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                    <FaTimes /> Reject
                                </button>
                            </>
                        )}
                        {app.status === "SHORTLISTED" && (
                            <>
                                <button onClick={onApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                    <FaCheck /> Approve
                                </button>
                                <button onClick={onReject} disabled={processing} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                    <FaTimes /> Reject
                                </button>
                            </>
                        )}
                        {app.status === "APPROVED" && (
                            <button onClick={onHire} disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2">
                                <FaUserPlus /> Hire as Agent
                            </button>
                        )}
                        {app.status === "HIRED" && (
                            <span className="text-green-600 font-medium flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
                                <FaCheck /> Hired - Agent ID: {app.hiredAsAgentId}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoSection({ title, icon: Icon, color, children }) {
    const colors = {
        indigo: "text-indigo-500",
        red: "text-red-500",
        green: "text-green-500",
        purple: "text-purple-500",
    };
    return (
        <div className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Icon className={colors[color]} /> {title}
            </h4>
            <div className="space-y-1 text-sm">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="py-1">
            <span className="text-gray-500 text-xs block">{label}</span>
            <span className="font-medium text-gray-900 break-all">{value}</span>
        </div>
    );
}

function DocLink({ href, icon: Icon, label, color, pdf }) {
    const [downloading, setDownloading] = useState(false);

    const colors = {
        blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
        green: "bg-green-100 text-green-600 hover:bg-green-200",
        purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
        indigo: "bg-indigo-100 text-indigo-600 hover:bg-indigo-200",
    };

    // Handle PDF download via JavaScript fetch
    const handleClick = async (e) => {
        if (pdf) {
            e.preventDefault();
            setDownloading(true);
            try {
                const response = await fetch(href);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Extract filename from URL
                const filename = href.split('/').pop() || 'document.pdf';
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Download failed:', error);
                // Fallback: open in new tab
                window.open(href, '_blank');
            } finally {
                setDownloading(false);
            }
        }
    };

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${colors[color]} ${downloading ? 'opacity-50 cursor-wait' : ''}`}
        >
            <Icon /> {label} {pdf && <span className="text-xs opacity-60">{downloading ? '...' : '↓'}</span>}
            {!pdf && <FaExternalLinkAlt className="text-xs opacity-50" />}
        </a>
    );
}

