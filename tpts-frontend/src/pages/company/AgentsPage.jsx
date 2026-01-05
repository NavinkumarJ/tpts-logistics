import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyAgents, setAgentActiveStatus, deleteAgent, createAgent } from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUsers, FaUserPlus, FaPhone, FaEnvelope,
    FaMotorcycle, FaTruck, FaSearch, FaEllipsisV, FaTimes, FaSave, FaMapMarkerAlt,
    FaIdCard, FaFileAlt, FaImage, FaCar, FaUser, FaChevronDown, FaChevronUp,
    FaExternalLinkAlt, FaStar, FaCalendar, FaEye, FaUserTimes, FaUserCheck
} from "react-icons/fa";
import ConfirmModal from "../../components/common/ConfirmModal";
import ReasonInputModal from "../../components/common/ReasonInputModal";

export default function AgentsPage() {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewingAgent, setViewingAgent] = useState(null);
    const [processing, setProcessing] = useState(null);

    // Modal state for confirm/reason dialogs
    const [modalConfig, setModalConfig] = useState({
        type: null, // 'deactivate', 'activate', 'remove'
        agentId: null,
        agentName: null,
        agentEmail: null
    });

    useEffect(() => {
        fetchAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAgents = async () => {
        setLoading(true);
        try {
            const data = await getCompanyAgents();
            setAgents(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load agents");
            }
        } finally {
            setLoading(false);
        }
    };

    // Open deactivate modal
    const handleDeactivate = (agentId, agentName, agentEmail) => {
        setModalConfig({ type: 'deactivate', agentId, agentName, agentEmail });
        setSelectedAgent(null);
    };

    // Confirm deactivate with reason
    const confirmDeactivate = async (reason) => {
        const { agentId } = modalConfig;
        setModalConfig({ type: null, agentId: null, agentName: null, agentEmail: null });
        setProcessing(agentId);
        try {
            await setAgentActiveStatus(agentId, false, reason);
            toast.success("Agent deactivated");
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to deactivate agent");
        } finally {
            setProcessing(null);
        }
    };

    // Open activate modal
    const handleActivate = (agentId, agentName, agentEmail) => {
        setModalConfig({ type: 'activate', agentId, agentName, agentEmail });
        setSelectedAgent(null);
    };

    // Confirm activate
    const confirmActivate = async () => {
        const { agentId } = modalConfig;
        setModalConfig({ type: null, agentId: null, agentName: null, agentEmail: null });
        setProcessing(agentId);
        try {
            await setAgentActiveStatus(agentId, true);
            toast.success("Agent activated");
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to activate agent");
        } finally {
            setProcessing(null);
        }
    };

    // Open remove modal
    const handleRemove = (agentId, agentName) => {
        setModalConfig({ type: 'remove', agentId, agentName, agentEmail: null });
        setSelectedAgent(null);
    };

    // Confirm remove
    const confirmRemove = async () => {
        const { agentId } = modalConfig;
        setModalConfig({ type: null, agentId: null, agentName: null, agentEmail: null });
        setProcessing(agentId);
        try {
            await deleteAgent(agentId);
            toast.success("Agent removed");
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to remove agent");
        } finally {
            setProcessing(null);
        }
    };

    const closeModal = () => {
        setModalConfig({ type: null, agentId: null, agentName: null, agentEmail: null });
    };

    const handleCreateAgent = async (formData) => {
        try {
            await createAgent(formData);
            toast.success("Agent created successfully! Credentials sent via SMS.");
            setShowCreateModal(false);
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create agent");
        }
    };

    const filteredAgents = agents.filter(agent => {
        const matchesSearch = agent.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.phone?.includes(searchQuery);
        let matchesFilter = false;
        if (filter === "all") matchesFilter = true;
        else if (filter === "online") matchesFilter = agent.isActive && agent.isAvailable;
        else if (filter === "offline") matchesFilter = agent.isActive && !agent.isAvailable;
        else if (filter === "suspended") matchesFilter = !agent.isActive;
        return matchesSearch && matchesFilter;
    });

    const getVehicleIcon = (type) => {
        if (type?.toLowerCase().includes("bike") || type?.toLowerCase().includes("motor")) {
            return <FaMotorcycle className="text-orange-600" />;
        }
        return <FaTruck className="text-blue-600" />;
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading agents...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Delivery Agents</h1>
                    <p className="text-sm text-white/60 mt-1">
                        Manage your delivery team ({agents.length} agents)
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <FaUserPlus /> Add New Agent
                </button>
            </div>

            {/* Filters & Search */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        type="text"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {["all", "online", "offline", "suspended"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${filter === f
                                ? f === "suspended" ? "bg-red-500 text-white" : "bg-indigo-500 text-white"
                                : "bg-white/10 text-white/70 hover:bg-white/20 border border-white/20"
                                }`}
                        >
                            {f === "all" ? `All (${agents.length})` : f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Agents Grid */}
            {filteredAgents.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <FaUsers className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Agents Found</h3>
                    <p className="text-sm text-white/50 mb-4">
                        {filter !== "all"
                            ? `No ${filter} agents at the moment`
                            : "Add your first delivery agent to get started"}
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary"
                    >
                        <FaUserPlus className="inline mr-2" /> Add First Agent
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAgents.map((agent) => (
                        <div
                            key={agent.id}
                            className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 hover:bg-white/15 transition"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {agent.profilePhotoUrl ? (
                                        <img
                                            src={agent.profilePhotoUrl}
                                            alt={agent.fullName}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                            {agent.fullName?.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-white">{agent.fullName}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {/* Account Status Badge (Active/Suspended) */}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.isActive
                                                ? "bg-blue-500/20 text-blue-400"
                                                : "bg-red-500/20 text-red-400"
                                                }`}>
                                                {agent.isActive ? "Active" : "Suspended"}
                                            </span>
                                            {/* Availability Badge (only show if account is active) */}
                                            {agent.isActive && (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.isAvailable
                                                    ? "bg-green-500/20 text-green-400"
                                                    : "bg-white/20 text-white/60"
                                                    }`}>
                                                    {agent.isAvailable ? "Online" : "Offline"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        <FaEllipsisV className="text-white/40" />
                                    </button>
                                    {selectedAgent === agent.id && (
                                        <div className="absolute right-0 top-10 bg-slate-800 shadow-lg rounded-lg border border-white/20 py-2 w-40 z-10">
                                            <button
                                                onClick={() => {
                                                    setViewingAgent(agent);
                                                    setSelectedAgent(null);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2"
                                            >
                                                <FaEye className="text-indigo-400" /> View Details
                                            </button>
                                            {agent.isActive ? (
                                                <button
                                                    onClick={() => handleDeactivate(agent.id, agent.fullName, agent.email)}
                                                    disabled={processing === agent.id}
                                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <FaUserTimes className="text-red-400" /> Deactivate
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleActivate(agent.id, agent.fullName, agent.email)}
                                                    disabled={processing === agent.id}
                                                    className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <FaUserCheck className="text-green-400" /> Activate
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemove(agent.id, agent.fullName)}
                                                disabled={processing === agent.id}
                                                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                <FaTimes className="text-red-400" /> Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-white/60">
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-white/40" />
                                    {agent.phone}
                                </div>
                                {agent.email && (
                                    <div className="flex items-center gap-2">
                                        <FaEnvelope className="text-white/40" />
                                        <span className="truncate">{agent.email}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    {getVehicleIcon(agent.vehicleType)}
                                    {agent.vehicleType || "Not specified"}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-lg font-bold text-white">{agent.totalDeliveries || 0}</p>
                                    <p className="text-xs text-white/50">Deliveries</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-yellow-400">{agent.ratingAvg?.toFixed(1) || "N/A"}</p>
                                    <p className="text-xs text-white/50">Rating</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Agent Modal */}
            {showCreateModal && (
                <CreateAgentModal
                    onClose={() => setShowCreateModal(false)}
                    onSubmit={handleCreateAgent}
                />
            )}

            {/* View Agent Details Modal */}
            {viewingAgent && (
                <ViewAgentModal
                    agent={viewingAgent}
                    onClose={() => setViewingAgent(null)}
                />
            )}

            {/* Deactivate Agent Modal - with reason */}
            <ReasonInputModal
                isOpen={modalConfig.type === 'deactivate'}
                title="Deactivate Agent"
                subtitle={`Are you sure you want to deactivate ${modalConfig.agentName || 'this agent'}? They will not be able to log in or take orders.`}
                placeholder="Enter reason for deactivation (will be sent via email)"
                submitText="Deactivate Agent"
                variant="danger"
                onSubmit={confirmDeactivate}
                onClose={closeModal}
            />

            {/* Activate Agent Modal */}
            <ConfirmModal
                isOpen={modalConfig.type === 'activate'}
                title="Activate Agent"
                message={`Are you sure you want to activate ${modalConfig.agentName || 'this agent'}? They will be able to log in and take orders.`}
                confirmText="Activate Agent"
                confirmColor="green"
                onConfirm={confirmActivate}
                onClose={closeModal}
            />

            {/* Remove Agent Modal */}
            <ConfirmModal
                isOpen={modalConfig.type === 'remove'}
                title="Remove Agent"
                message={`Are you sure you want to remove ${modalConfig.agentName || 'this agent'}? This action cannot be undone.`}
                confirmText="Remove Agent"
                confirmColor="red"
                onConfirm={confirmRemove}
                onClose={closeModal}
            />
        </div>
    );
}

function CreateAgentModal({ onClose, onSubmit }) {
    const [submitting, setSubmitting] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(null);
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        city: "",
        pincode: "",
        vehicleType: "BIKE",
        vehicleNumber: "",
        licenseNumber: "",
        // Document URLs
        profilePhotoUrl: "",
        licenseDocumentUrl: "",
        aadhaarDocumentUrl: "",
        rcDocumentUrl: "",
        vehiclePhotoUrl: "",
    });

    const handleFileUpload = async (e, fieldName) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (max 10MB for documents, 5MB for images)
        const maxSize = fieldName.includes('Photo') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error(`File size too large. Maximum: ${fieldName.includes('Photo') ? '5MB' : '10MB'}`);
            return;
        }

        // Validate file type - be more permissive
        const isPhoto = fieldName.includes('Photo');
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (isPhoto && !isImage) {
            toast.error('Please upload an image file (JPEG, PNG, etc.)');
            return;
        }

        if (!isPhoto && !isImage && !isPDF) {
            toast.error('Please upload an image (JPEG, PNG) or PDF file');
            return;
        }

        setUploadingDoc(fieldName);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

            // Use appropriate endpoint for each document type
            let endpoint = "/upload/job-document";
            if (fieldName === "profilePhotoUrl") {
                endpoint = "/upload/profile";
            } else if (fieldName === "vehiclePhotoUrl") {
                endpoint = "/upload/vehicle-photo";
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${endpoint}`, {
                method: 'POST',
                body: uploadFormData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Upload failed with status ${response.status}`);
            }

            const data = await response.json();
            setFormData(prev => ({
                ...prev,
                [fieldName]: data.data.url
            }));
            toast.success("Document uploaded successfully!");
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.message || "Failed to upload. Please try again.");
        } finally {
            setUploadingDoc(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.fullName || !formData.email || !formData.phone) {
            toast.error("Please fill in all required fields");
            return;
        }

        setSubmitting(true);
        await onSubmit(formData);
        setSubmitting(false);
    };

    const DocumentUploadField = ({ label, fieldName, accept, required }) => {
        const isPhoto = fieldName.includes('Photo');
        const maxSize = isPhoto ? '5MB' : '10MB';
        const allowedFormats = isPhoto ? 'JPEG, PNG' : 'JPEG, PNG, PDF';
        const isUploaded = !!formData[fieldName];

        // Extract filename from URL
        const getFileName = (url) => {
            if (!url) return '';
            const parts = url.split('/');
            return parts[parts.length - 1] || 'Uploaded';
        };

        return (
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                    <span className="text-xs text-gray-400 font-normal ml-1">({allowedFormats}, max {maxSize})</span>
                </label>

                {isUploaded ? (
                    // Show uploaded state with filename
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <span className="text-green-600 text-lg">✓</span>
                        <span className="text-sm text-green-700 truncate flex-1" title={formData[fieldName]}>
                            {getFileName(formData[fieldName]).substring(0, 25)}...
                        </span>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, [fieldName]: '' }))}
                            className="text-xs text-gray-500 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                        >
                            Remove
                        </button>
                    </div>
                ) : (
                    // Show file input
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            accept={accept}
                            onChange={(e) => handleFileUpload(e, fieldName)}
                            disabled={uploadingDoc === fieldName}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                        {uploadingDoc === fieldName && (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FaUserPlus className="text-indigo-600" /> Add New Agent
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            📋 Personal Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    className="input"
                                    placeholder="Enter full name"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input pl-10"
                                        placeholder="agent@example.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input pl-10"
                                        placeholder="9876543210"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                <div className="relative">
                                    <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="input pl-10"
                                        placeholder="City"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                <input
                                    type="text"
                                    value={formData.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                    className="input"
                                    placeholder="6-digit pincode"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            🚗 Vehicle Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                                <select
                                    value={formData.vehicleType}
                                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                                    className="input"
                                >
                                    <option value="BIKE">Bike</option>
                                    <option value="SCOOTER">Scooter</option>
                                    <option value="CAR">Car</option>
                                    <option value="VAN">Van</option>
                                    <option value="TRUCK">Truck</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                                <input
                                    type="text"
                                    value={formData.vehicleNumber}
                                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                    className="input"
                                    placeholder="TN10AB1234"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                                <input
                                    type="text"
                                    value={formData.licenseNumber}
                                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                                    className="input"
                                    placeholder="Driving license number"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Document Uploads */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            📄 Documents (Optional)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DocumentUploadField
                                label="Profile Photo"
                                fieldName="profilePhotoUrl"
                                accept="image/*"
                            />
                            <DocumentUploadField
                                label="Vehicle Photo"
                                fieldName="vehiclePhotoUrl"
                                accept="image/*"
                            />
                            <DocumentUploadField
                                label="Driving License"
                                fieldName="licenseDocumentUrl"
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            <DocumentUploadField
                                label="Aadhaar Card"
                                fieldName="aadhaarDocumentUrl"
                                accept=".pdf,.jpg,.jpeg,.png"
                            />
                            <div className="md:col-span-2">
                                <DocumentUploadField
                                    label="Vehicle RC"
                                    fieldName="rcDocumentUrl"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                        <strong>Note:</strong> Login credentials will be automatically sent to the agent's phone via SMS.
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-outline flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || uploadingDoc}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <FaSave /> {submitting ? "Creating..." : uploadingDoc ? "Uploading..." : "Create Agent"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// View Agent Details Modal
function ViewAgentModal({ agent, onClose }) {
    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    // Format service pincodes - handle JSON array or continuous string
    const formatServicePincodes = (pincodes) => {
        if (!pincodes) return [];

        // Convert to string if it's a number
        const pincodeStr = String(pincodes);

        // Check if it's a continuous string of digits (6-digit pincodes without separators)
        if (/^\d+$/.test(pincodeStr) && pincodeStr.length > 6) {
            // Split into 6-digit chunks
            const chunks = pincodeStr.match(/.{1,6}/g) || [];
            return chunks;
        }

        // Try parsing as JSON array
        try {
            const parsed = JSON.parse(pincodeStr);
            if (Array.isArray(parsed)) {
                return parsed.map(p => String(p));
            }
        } catch {
            // Not JSON
        }

        // Check if comma-separated
        if (pincodeStr.includes(',')) {
            return pincodeStr.split(',').map(p => p.trim());
        }

        // Single pincode
        return [pincodeStr];
    };

    const handleOpenDocument = (url) => {
        window.open(url, '_blank');
    };

    const DocLink = ({ url, icon: Icon, label, color }) => {
        if (!url) return null;
        const colors = {
            blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
            green: "bg-green-100 text-green-600 hover:bg-green-200",
            purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
            indigo: "bg-indigo-100 text-indigo-600 hover:bg-indigo-200",
            orange: "bg-orange-100 text-orange-600 hover:bg-orange-200",
        };
        return (
            <button
                onClick={() => handleOpenDocument(url)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${colors[color]}`}
                title="Open document"
            >
                <Icon /> {label} <FaExternalLinkAlt className="text-xs opacity-50" />
            </button>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                    <div className="flex items-center gap-4">
                        {agent.profilePhotoUrl ? (
                            <img
                                src={agent.profilePhotoUrl}
                                alt={agent.fullName}
                                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl">
                                {agent.fullName?.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{agent.fullName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.isAvailable
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                    }`}>
                                    {agent.isAvailable ? "Available" : "Busy"}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${agent.isActive
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                    }`}>
                                    {agent.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900">{agent.totalDeliveries || 0}</p>
                            <p className="text-xs text-gray-500">Total Deliveries</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                                <FaStar className="text-yellow-400" /> {agent.ratingAvg?.toFixed(1) || "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">Rating</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-indigo-600">{agent.currentOrdersCount || 0}</p>
                            <p className="text-xs text-gray-500">Active Orders</p>
                        </div>
                    </div>

                    {/* Info Sections */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Contact Info */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FaUser className="text-indigo-500" /> Contact Information
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-gray-400" />
                                    <span>{agent.phone || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaEnvelope className="text-gray-400" />
                                    <span className="break-all">{agent.email || "N/A"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <FaMapMarkerAlt className="text-gray-400" />
                                    <span>{agent.city || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Info */}
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FaCar className="text-green-500" /> Vehicle Details
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-500 text-xs block">Vehicle Type</span>
                                    <span className="font-medium capitalize">{agent.vehicleType || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs block">Vehicle Number</span>
                                    <span className="font-medium">{agent.vehicleNumber || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs block">License Number</span>
                                    <span className="font-medium">{agent.licenseNumber || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Areas */}
                    {agent.servicePincodes && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-red-500" /> Service Areas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {formatServicePincodes(agent.servicePincodes).map((pincode, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium"
                                    >
                                        📍 {pincode}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Documents Section */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FaFileAlt className="text-orange-500" /> Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            <DocLink url={agent.profilePhotoUrl} icon={FaImage} label="Profile Photo" color="blue" />
                            <DocLink url={agent.licenseDocumentUrl} icon={FaIdCard} label="Driving License" color="green" />
                            <DocLink url={agent.aadhaarDocumentUrl} icon={FaIdCard} label="Aadhaar Card" color="purple" />
                            <DocLink url={agent.rcDocumentUrl} icon={FaCar} label="Vehicle RC" color="indigo" />
                            <DocLink url={agent.vehiclePhotoUrl} icon={FaImage} label="Vehicle Photo" color="orange" />

                            {!agent.profilePhotoUrl && !agent.licenseDocumentUrl && !agent.aadhaarDocumentUrl && !agent.rcDocumentUrl && !agent.vehiclePhotoUrl && (
                                <p className="text-sm text-gray-400">No documents uploaded</p>
                            )}
                        </div>
                    </div>

                    {/* Timestamps */}
                    <div className="text-xs text-gray-400 flex items-center gap-4 pt-4 border-t border-gray-100">
                        <span className="flex items-center gap-1">
                            <FaCalendar /> Joined: {formatDate(agent.createdAt)}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="btn-outline w-full"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
