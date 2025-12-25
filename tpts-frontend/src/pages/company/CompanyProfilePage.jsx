import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCompany, updateCompanyLogo } from "../../services/companyService";
import { logout, getUser, setUser } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaStar, FaCamera, FaEdit, FaCheckCircle, FaCog, FaTruck, FaRupeeSign } from "react-icons/fa";

export default function CompanyProfilePage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [company, setCompany] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchProfile();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = await getCurrentCompany();
            setCompany(data);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load profile");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB");
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("logo", file);

            const updatedCompany = await updateCompanyLogo(formData);
            setCompany(updatedCompany);

            // Update user in local storage with new logo
            const user = getUser();
            if (user) {
                user.companyLogoUrl = updatedCompany.companyLogoUrl;
                setUser(user);
            }

            toast.success("Logo updated successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to upload logo");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading profile...</p>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="text-center py-12">
                <FaBuilding className="text-5xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Company profile not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage your company information</p>
                </div>
                <button
                    onClick={() => navigate("/company/settings")}
                    className="btn-outline flex items-center gap-2"
                >
                    <FaCog /> Edit Settings
                </button>
            </div>

            {/* Profile Card with Logo Upload */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {/* Cover */}
                <div className="h-36 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 relative">
                    <div className="absolute inset-0 bg-black/10"></div>
                </div>

                {/* Profile Info */}
                <div className="relative px-6 pb-6">
                    {/* Logo with Upload */}
                    <div className="absolute -top-14 left-6">
                        <div className="relative group">
                            <div className="w-28 h-28 rounded-xl bg-white shadow-lg flex items-center justify-center border-4 border-white overflow-hidden">
                                {company.companyLogoUrl ? (
                                    <img
                                        src={company.companyLogoUrl}
                                        alt={company.companyName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-4xl font-bold text-white">
                                            {company.companyName?.charAt(0) || "C"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Upload Overlay */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center cursor-pointer"
                            >
                                {uploading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <div className="text-white text-center">
                                        <FaCamera className="text-xl mx-auto mb-1" />
                                        <span className="text-xs">Change</span>
                                    </div>
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* Company Name & Status */}
                    <div className="pt-16 flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{company.companyName}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <FaMapMarkerAlt className="text-gray-400 text-sm" />
                                <span className="text-gray-500">{company.city}, {company.state}</span>
                            </div>
                            {company.description && (
                                <p className="text-gray-600 mt-2 text-sm max-w-xl">{company.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {company.isApproved && (
                                <span className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                    <FaCheckCircle /> Verified
                                </span>
                            )}
                            <div className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full">
                                <FaStar className="text-yellow-500" />
                                <span className="font-bold">{Number(company.ratingAvg || 0).toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={FaTruck}
                    value={company.totalDeliveries || 0}
                    label="Total Deliveries"
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                />
                <StatCard
                    icon={FaBuilding}
                    value={company.totalAgents || 0}
                    label="Active Agents"
                    color="text-green-600"
                    bgColor="bg-green-50"
                />
                <StatCard
                    icon={FaRupeeSign}
                    value={`₹${company.baseRatePerKm || 0}/km`}
                    label="Base Rate"
                    color="text-purple-600"
                    bgColor="bg-purple-50"
                />
                <StatCard
                    icon={FaMapMarkerAlt}
                    value={company.serviceCities?.length || 0}
                    label="Cities Served"
                    color="text-orange-600"
                    bgColor="bg-orange-50"
                />
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-4">
                        <InfoRow
                            icon={FaEnvelope}
                            label="Email"
                            value={company.contactEmail || company.email}
                            color="bg-indigo-100 text-indigo-600"
                        />
                        <InfoRow
                            icon={FaPhone}
                            label="Phone"
                            value={company.contactPhone || company.phone}
                            color="bg-green-100 text-green-600"
                        />
                        <InfoRow
                            icon={FaMapMarkerAlt}
                            label="Address"
                            value={
                                <div>
                                    <p>{company.address}</p>
                                    <p className="text-gray-500 text-sm">{company.city}, {company.state} - {company.pincode}</p>
                                </div>
                            }
                            color="bg-purple-100 text-purple-600"
                        />
                    </div>
                </div>

                {/* Business Details */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
                    <div className="space-y-3">
                        {company.gstNumber && (
                            <DetailRow label="GST Number" value={company.gstNumber} />
                        )}
                        {company.registrationNumber && (
                            <DetailRow label="Registration No." value={company.registrationNumber} />
                        )}
                        <DetailRow
                            label="Account Status"
                            value={company.isApproved ? "Approved & Active" : "Pending Approval"}
                            valueClass={company.isApproved ? "text-green-600" : "text-yellow-600"}
                        />
                        <DetailRow
                            label="Hiring Status"
                            value={company.isHiring ? `Hiring (${company.openPositions || 0} positions)` : "Not Hiring"}
                            valueClass={company.isHiring ? "text-green-600" : "text-gray-600"}
                        />
                        <DetailRow
                            label="Member Since"
                            value={new Date(company.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric", month: "long", year: "numeric"
                            })}
                        />
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Rates</h3>
                <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-3xl font-bold text-indigo-600">₹{company.baseRatePerKm || 0}</p>
                        <p className="text-sm text-gray-500">per Kilometer</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">₹{company.ratePerKg || company.baseRatePerKg || 0}</p>
                        <p className="text-sm text-gray-500">per Kilogram</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{company.groupDiscountPercentage || 0}%</p>
                        <p className="text-sm text-gray-500">Group Discount</p>
                    </div>
                </div>
            </div>

            {/* Service Cities */}
            {company.serviceCities?.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Cities ({company.serviceCities.length})</h3>
                    <div className="flex flex-wrap gap-2">
                        {company.serviceCities.map((city) => (
                            <span key={city} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                                {city}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, value, label, color, bgColor }) {
    return (
        <div className="bg-white rounded-xl p-5 shadow-md border border-gray-200 text-center">
            <div className={`w-10 h-10 rounded-full ${bgColor} ${color} flex items-center justify-center mx-auto mb-2`}>
                <Icon />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value, color }) {
    return (
        <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon />
            </div>
            <div>
                <p className="text-xs text-gray-500">{label}</p>
                <div className="font-medium text-gray-900">{value}</div>
            </div>
        </div>
    );
}

function DetailRow({ label, value, valueClass = "text-gray-900" }) {
    return (
        <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
            <span className="text-gray-500">{label}</span>
            <span className={`font-medium ${valueClass}`}>{value}</span>
        </div>
    );
}
