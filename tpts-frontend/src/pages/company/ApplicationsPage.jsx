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
    PENDING: { label: "Pending", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
    SHORTLISTED: { label: "Shortlisted", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    UNDER_REVIEW: { label: "Under Review", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    INTERVIEW_SCHEDULED: { label: "Interview", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    APPROVED: { label: "Approved", bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    REJECTED: { label: "Rejected", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    HIRED: { label: "Hired", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
    WITHDRAWN: { label: "Withdrawn", bg: "bg-white/20", text: "text-white/60", border: "border-white/30" },
};

const ITEMS_PER_PAGE = 8;

const isPdfUrl = (url) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    // Check for common PDF indicators in Cloudinary URLs
    return lowerUrl.includes('.pdf') ||
        lowerUrl.includes('/raw/') ||
        lowerUrl.includes('pdf') ||
        lowerUrl.includes('application%2fpdf');
};

// Just return the URL directly - modern browsers have native PDF viewers
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading applications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/20 rounded-xl">
                        <FaUserPlus className="text-2xl text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Hiring Management</h1>
                        <p className="text-sm text-white/60">Review and manage delivery agent applications</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchApplications}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition text-sm font-medium text-white"
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
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Applications List */}
            {paginatedApps.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <FaUserPlus className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Applications</h3>
                    <p className="text-sm text-white/50">
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold text-white mb-4">Reject Application</h3>
                        <p className="text-sm text-white/60 mb-4">
                            Please provide a reason for rejection. This will be sent to the applicant.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-4"
                            rows={3}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={processing}
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium transition"
                            >
                                {processing ? "Rejecting..." : "Confirm Reject"}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason("");
                                }}
                                className="flex-1 px-5 py-2.5 bg-white/10 border border-white/20 text-white rounded-xl font-medium hover:bg-white/20 transition"
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
        gray: { bg: "bg-indigo-500/20", text: "text-white", border: "border-indigo-500/30", activeBorder: "border-indigo-500" },
        yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30", activeBorder: "border-yellow-500" },
        green: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30", activeBorder: "border-green-500" },
        indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30", activeBorder: "border-indigo-500" },
        red: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", activeBorder: "border-red-500" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 backdrop-blur-xl ${active ? `${c.bg} ${c.activeBorder} ring-2 ring-offset-1 ring-offset-transparent ring-white/30` : `${c.bg} ${c.border} hover:bg-white/10`
                }`}
        >
            <Icon className={`text-xl ${c.text} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${active ? c.text : "text-white"}`}>{value}</p>
            <p className="text-xs text-white/50">{label}</p>
        </button>
    );
}

function ApplicationCard({ app, expanded, onToggle, getStatusBadge, formatDate, onShortlist, onApprove, onReject, onHire, processing }) {
    return (
        <div className={`bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden transition ${app.status === "PENDING" ? "border-l-4 border-l-yellow-500" :
            app.status === "APPROVED" ? "border-l-4 border-l-green-500" :
                app.status === "HIRED" ? "border-l-4 border-l-indigo-500" :
                    ""
            }`}>
            {/* Header - Always Visible */}
            <div className="p-5 cursor-pointer hover:bg-white/5 transition" onClick={onToggle}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Applicant Info */}
                    <div className="flex items-center gap-4 flex-1">
                        {app.photoUrl ? (
                            <img
                                src={app.photoUrl}
                                alt={app.applicantName}
                                className="w-14 h-14 rounded-full object-cover border-2 border-white/20"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl">
                                {app.applicantName?.charAt(0)}
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-lg text-white">{app.applicantName}</p>
                                {getStatusBadge(app.status)}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-1 text-sm text-white/60">
                                <span className="flex items-center gap-1">
                                    <FaPhone className="text-white/40 text-xs" /> {app.applicantPhone}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaMotorcycle className="text-white/40 text-xs" /> {app.vehicleType || "N/A"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaBriefcase className="text-white/40 text-xs" /> {app.experienceYears || 0}+ years
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaCalendar className="text-white/40 text-xs" /> {formatDate(app.appliedAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Expand Toggle */}
                    <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1">
                        {expanded ? <>Hide <FaChevronUp /></> : <>Details <FaChevronDown /></>}
                    </button>
                </div>
            </div>

            {/* Expanded Details */}
            {expanded && (
                <div className="border-t border-white/10 bg-white/5 p-5">
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
                    <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <FaClock className="text-blue-400" /> Preferences & Availability
                        </h4>
                        <div className="grid sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-white/50 text-xs block">Preferred Shifts</span>
                                <span className="font-medium text-white capitalize">{app.preferredShifts || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs block">Available From</span>
                                <span className="font-medium text-white">{app.availableFrom || "N/A"}</span>
                            </div>
                            <div>
                                <span className="text-white/50 text-xs block">Weekend Availability</span>
                                <span className={`font-medium ${app.weekendAvailability ? 'text-green-400' : 'text-red-400'}`}>
                                    {app.weekendAvailability ? "✓ Available" : "✗ Not Available"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cover Letter */}
                    {app.coverLetter && (
                        <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <FaFileAlt className="text-blue-400" /> Cover Letter
                            </h4>
                            <p className="text-sm text-white/70 whitespace-pre-wrap">{app.coverLetter}</p>
                        </div>
                    )}

                    {/* Documents */}
                    <div className="bg-white/10 rounded-xl p-4 mb-4 border border-white/10">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <FaFileAlt className="text-orange-400" /> Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {app.photoUrl && <DocLink href={app.photoUrl} icon={FaImage} label="Photo" color="blue" />}
                            {app.licenseDocumentUrl && <DocLink href={getDocViewerUrl(app.licenseDocumentUrl)} icon={FaIdCard} label="License" color="green" pdf={isPdfUrl(app.licenseDocumentUrl)} />}
                            {app.aadhaarDocumentUrl && <DocLink href={getDocViewerUrl(app.aadhaarDocumentUrl)} icon={FaIdCard} label="Aadhaar" color="purple" pdf={isPdfUrl(app.aadhaarDocumentUrl)} />}
                            {app.rcDocumentUrl && <DocLink href={getDocViewerUrl(app.rcDocumentUrl)} icon={FaCar} label="RC" color="indigo" pdf={isPdfUrl(app.rcDocumentUrl)} />}
                            {app.vehiclePhotoUrl && <DocLink href={app.vehiclePhotoUrl} icon={FaImage} label="Vehicle Photo" color="green" />}
                            {!app.photoUrl && !app.licenseDocumentUrl && !app.aadhaarDocumentUrl && !app.rcDocumentUrl && (
                                <p className="text-sm text-white/40">No documents uploaded</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                        {app.status === "PENDING" && (
                            <>
                                <button onClick={onShortlist} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition">
                                    <FaCheck /> Shortlist
                                </button>
                                <button onClick={onReject} disabled={processing} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition">
                                    <FaTimes /> Reject
                                </button>
                            </>
                        )}
                        {app.status === "SHORTLISTED" && (
                            <>
                                <button onClick={onApprove} disabled={processing} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition">
                                    <FaCheck /> Approve
                                </button>
                                <button onClick={onReject} disabled={processing} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition">
                                    <FaTimes /> Reject
                                </button>
                            </>
                        )}
                        {app.status === "APPROVED" && (
                            <button onClick={onHire} disabled={processing} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition">
                                <FaUserPlus /> Hire as Agent
                            </button>
                        )}
                        {app.status === "HIRED" && (
                            <span className="text-green-400 font-medium flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-xl border border-green-500/30">
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
        indigo: "text-indigo-400",
        red: "text-red-400",
        green: "text-green-400",
        purple: "text-purple-400",
    };
    return (
        <div className="bg-white/10 rounded-xl p-4 border border-white/10">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <Icon className={colors[color]} /> {title}
            </h4>
            <div className="space-y-1 text-sm">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="py-1">
            <span className="text-white/50 text-xs block">{label}</span>
            <span className="font-medium text-white break-all">{value}</span>
        </div>
    );
}

function DocLink({ href, icon: Icon, label, color, pdf }) {
    const colors = {
        blue: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30",
        green: "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30",
        purple: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border border-purple-500/30",
        indigo: "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30",
    };

    // Simple open in new tab - avoids CORS issues with Cloudinary
    const handleOpen = (e) => {
        e.preventDefault();
        window.open(href, '_blank');
    };

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpen}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${colors[color]}`}
            title={pdf ? "View PDF" : "Open"}
        >
            <Icon /> {label}
            {!pdf && <FaExternalLinkAlt className="text-xs opacity-50" />}
            {pdf && <span className="text-xs opacity-60">↗</span>}
        </a>
    );
}

