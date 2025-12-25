import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyAgents, setAgentActiveStatus, deleteAgent, createAgent } from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaUsers, FaUserPlus, FaPhone, FaEnvelope,
    FaMotorcycle, FaTruck, FaSearch, FaEllipsisV, FaTimes, FaSave, FaMapMarkerAlt
} from "react-icons/fa";

export default function AgentsPage() {
    const navigate = useNavigate();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    const handleToggleStatus = async (agentId, currentStatus) => {
        try {
            await setAgentActiveStatus(agentId, !currentStatus);
            toast.success(currentStatus ? "Agent deactivated" : "Agent activated");
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update status");
        }
    };

    const handleDeleteAgent = async (agentId) => {
        if (!confirm("Are you sure you want to remove this agent?")) return;
        try {
            await deleteAgent(agentId);
            toast.success("Agent removed");
            fetchAgents();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to remove agent");
        }
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
        const matchesFilter = filter === "all" ||
            (filter === "available" && agent.isAvailable) ||
            (filter === "busy" && !agent.isAvailable);
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
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading agents...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Delivery Agents</h1>
                    <p className="text-sm text-gray-500 mt-1">
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
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search agents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                    />
                </div>
                <div className="flex gap-2">
                    {["all", "available", "busy"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${filter === f
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Agents Grid */}
            {filteredAgents.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaUsers className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agents Found</h3>
                    <p className="text-sm text-gray-500 mb-4">
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
                            className="bg-white rounded-xl p-6 shadow-md border border-gray-200 hover:shadow-lg transition"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                                        {agent.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{agent.fullName}</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.isAvailable
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                            }`}>
                                            {agent.isAvailable ? "Available" : "Busy"}
                                        </span>
                                    </div>
                                </div>
                                <div className="relative">
                                    <button
                                        onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                                        className="p-2 hover:bg-gray-100 rounded-lg"
                                    >
                                        <FaEllipsisV className="text-gray-400" />
                                    </button>
                                    {selectedAgent === agent.id && (
                                        <div className="absolute right-0 top-10 bg-white shadow-lg rounded-lg border border-gray-200 py-2 w-40 z-10">
                                            <button
                                                onClick={() => handleToggleStatus(agent.id, agent.isActive)}
                                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                                            >
                                                {agent.isActive ? "Deactivate" : "Activate"}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAgent(agent.id)}
                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <FaPhone className="text-gray-400" />
                                    {agent.phone}
                                </div>
                                {agent.email && (
                                    <div className="flex items-center gap-2">
                                        <FaEnvelope className="text-gray-400" />
                                        <span className="truncate">{agent.email}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    {getVehicleIcon(agent.vehicleType)}
                                    {agent.vehicleType || "Not specified"}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-lg font-bold text-gray-900">{agent.totalDeliveries || 0}</p>
                                    <p className="text-xs text-gray-500">Deliveries</p>
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-yellow-600">{agent.ratingAvg?.toFixed(1) || "N/A"}</p>
                                    <p className="text-xs text-gray-500">Rating</p>
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

        setUploadingDoc(fieldName);

        try {
            const uploadFormData = new FormData();
            uploadFormData.append("file", file);

            // Use profile endpoint for profile photo, job-document for others
            const endpoint = fieldName === "profilePhotoUrl"
                ? "/upload/profile"
                : "/upload/job-document";

            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}${endpoint}`, {
                method: 'POST',
                body: uploadFormData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setFormData(prev => ({
                ...prev,
                [fieldName]: data.data.url
            }));
            toast.success("Document uploaded successfully!");
        } catch (err) {
            toast.error(`Failed to upload. Please try again.`);
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

    const DocumentUploadField = ({ label, fieldName, accept, required }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
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
                {formData[fieldName] && (
                    <span className="text-green-600 text-sm">✓</span>
                )}
            </div>
        </div>
    );

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
