import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentCompany, updateCompanyProfile, updateHiringSettings, updateCompanyLogo } from "../../services/companyService";
import { logout, getUser, setUser } from "../../utils/auth";
import toast from "react-hot-toast";
import {
    FaBuilding, FaUserPlus, FaMapMarkerAlt, FaCheck, FaPlus, FaTimes,
    FaMoneyBillWave, FaCamera, FaSync, FaInfoCircle, FaPercentage, FaRupeeSign
} from "react-icons/fa";

export default function CompanySettingsPage() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeSection, setActiveSection] = useState("profile");

    const [profileData, setProfileData] = useState({
        companyName: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        contactPhone: "",
        contactEmail: "",
        contactPersonName: "",
        description: "",
    });

    const [hiringData, setHiringData] = useState({
        isHiring: false,
        openPositions: 0,
        salaryRangeMin: 0,
        salaryRangeMax: 0,
        requirements: "",
    });

    const [serviceCities, setServiceCities] = useState([]);
    const [newCity, setNewCity] = useState("");

    const [pricingData, setPricingData] = useState({
        baseRatePerKm: 0,
        ratePerKg: 0,
        groupDiscountPercentage: 0,
    });

    useEffect(() => {
        fetchCompany();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCompany = async () => {
        setLoading(true);
        try {
            const data = await getCurrentCompany();
            setCompany(data);
            setProfileData({
                companyName: data.companyName || "",
                address: data.address || "",
                city: data.city || "",
                state: data.state || "",
                pincode: data.pincode || "",
                contactPhone: data.contactPhone || data.phone || "",
                contactEmail: data.contactEmail || data.email || "",
                contactPersonName: data.contactPersonName || "",
                description: data.description || "",
            });
            setHiringData({
                isHiring: data.isHiring || false,
                openPositions: data.openPositions || 0,
                salaryRangeMin: data.salaryRangeMin || 0,
                salaryRangeMax: data.salaryRangeMax || 0,
                requirements: data.requirements || "",
            });
            setServiceCities(data.serviceCities || []);
            setPricingData({
                baseRatePerKm: data.baseRatePerKm || 0,
                ratePerKg: data.ratePerKg || data.baseRatePerKg || 0,
                groupDiscountPercentage: data.groupDiscountPercentage || 0,
            });
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load company settings");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

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

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleHiringChange = (e) => {
        const { name, value, type, checked } = e.target;
        setHiringData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value
        }));
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateCompanyProfile({ ...profileData, serviceCities });
            toast.success("Profile updated successfully");
            fetchCompany();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveHiring = async () => {
        setSaving(true);
        try {
            await updateHiringSettings(hiringData);
            toast.success("Hiring settings updated");
            fetchCompany();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update hiring settings");
        } finally {
            setSaving(false);
        }
    };

    const addServiceCity = () => {
        if (newCity.trim() && !serviceCities.includes(newCity.trim())) {
            setServiceCities([...serviceCities, newCity.trim()]);
            setNewCity("");
        }
    };

    const removeServiceCity = (city) => {
        setServiceCities(serviceCities.filter(c => c !== city));
    };

    const handlePricingChange = (e) => {
        const { name, value } = e.target;
        setPricingData(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleSavePricing = async () => {
        setSaving(true);
        try {
            await updateCompanyProfile(pricingData);
            toast.success("Pricing updated successfully");
            fetchCompany();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update pricing");
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { id: "profile", label: "Company Profile", icon: FaBuilding, color: "text-indigo-400" },
        { id: "pricing", label: "Pricing & Rates", icon: FaMoneyBillWave, color: "text-green-400" },
        { id: "hiring", label: "Hiring Settings", icon: FaUserPlus, color: "text-purple-400" },
        { id: "cities", label: "Service Cities", icon: FaMapMarkerAlt, color: "text-orange-400" },
    ];

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Company Settings</h1>
                    <p className="text-sm text-white/60 mt-1">Manage your company profile and preferences</p>
                </div>
                <button
                    onClick={fetchCompany}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/15 transition text-sm font-medium text-white self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl p-4 border border-white/20 sticky top-6">
                        {/* Company Logo Preview */}
                        <div className="text-center pb-4 border-b border-white/10 mb-4">
                            <div className="relative inline-block group">
                                <div className="w-20 h-20 rounded-xl bg-white/10 mx-auto flex items-center justify-center overflow-hidden border-2 border-white/20">
                                    {company?.companyLogoUrl ? (
                                        <img src={company.companyLogoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FaBuilding className="text-3xl text-white/40" />
                                    )}
                                </div>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-md transition"
                                >
                                    {uploading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaCamera className="text-xs" />
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
                            <p className="text-xs text-white/50 mt-2">Click camera to change logo</p>
                        </div>

                        <nav className="space-y-1">
                            {sections.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${activeSection === section.id
                                        ? "bg-indigo-600 text-white shadow-lg"
                                        : "text-white/70 hover:bg-white/10"
                                        }`}
                                >
                                    <section.icon className={activeSection === section.id ? "text-white" : section.color} />
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-3">
                    {/* Company Profile */}
                    {activeSection === "profile" && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <FaBuilding className="text-indigo-400" /> Company Profile
                            </h2>

                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                                        <input type="text" name="companyName" className="input" value={profileData.companyName} onChange={handleProfileChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Person Name</label>
                                        <input type="text" name="contactPersonName" className="input" value={profileData.contactPersonName} onChange={handleProfileChange} placeholder="Admin name" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                                    <textarea name="address" className="input" rows={2} value={profileData.address} onChange={handleProfileChange} />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                                        <input type="text" name="city" className="input" value={profileData.city} onChange={handleProfileChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                                        <input type="text" name="state" className="input" value={profileData.state} onChange={handleProfileChange} />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                                        <input type="text" name="pincode" className="input" value={profileData.pincode} onChange={handleProfileChange} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Phone</label>
                                        <input type="tel" name="contactPhone" className="input" value={profileData.contactPhone} onChange={handleProfileChange} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Email</label>
                                        <input type="email" name="contactEmail" className="input" value={profileData.contactEmail} onChange={handleProfileChange} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <textarea name="description" className="input" rows={3} value={profileData.description} onChange={handleProfileChange} placeholder="Brief description of your company..." />
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            <><FaCheck /> Save Profile</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pricing & Rates */}
                    {activeSection === "pricing" && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <FaMoneyBillWave className="text-green-400" /> Pricing & Rates
                            </h2>

                            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30 mb-6 flex items-start gap-3">
                                <FaInfoCircle className="text-blue-400 mt-0.5" />
                                <p className="text-sm text-blue-300">
                                    These rates are used to calculate delivery prices for customers selecting your company.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-green-500/20 rounded-xl p-5 border border-green-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                            <FaRupeeSign className="text-green-400" />
                                        </div>
                                        <label className="text-sm font-medium text-white">Rate per KM</label>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">₹</span>
                                        <input
                                            type="number"
                                            name="baseRatePerKm"
                                            className="w-full px-4 py-3 pl-8 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                            min="0"
                                            step="0.5"
                                            value={pricingData.baseRatePerKm}
                                            onChange={handlePricingChange}
                                        />
                                    </div>
                                </div>

                                <div className="bg-purple-500/20 rounded-xl p-5 border border-purple-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                            <FaRupeeSign className="text-purple-400" />
                                        </div>
                                        <label className="text-sm font-medium text-white">Rate per KG</label>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">₹</span>
                                        <input
                                            type="number"
                                            name="ratePerKg"
                                            className="w-full px-4 py-3 pl-8 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                            min="0"
                                            step="0.5"
                                            value={pricingData.ratePerKg}
                                            onChange={handlePricingChange}
                                        />
                                    </div>
                                </div>

                                <div className="bg-orange-500/20 rounded-xl p-5 border border-orange-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                            <FaPercentage className="text-orange-400" />
                                        </div>
                                        <label className="text-sm font-medium text-white">Group Discount</label>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="groupDiscountPercentage"
                                            className="w-full px-4 py-3 pr-8 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                            min="0"
                                            max="50"
                                            value={pricingData.groupDiscountPercentage}
                                            onChange={handlePricingChange}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50">%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-5 mt-6 border border-white/10">
                                <h4 className="font-semibold text-white mb-3">💰 Price Calculator Preview</h4>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">10km, 5kg Parcel</p>
                                        <p className="text-xl font-bold text-indigo-400">
                                            ₹{((pricingData.baseRatePerKm * 10) + (pricingData.ratePerKg * 5)).toFixed(0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">20km, 10kg Parcel</p>
                                        <p className="text-xl font-bold text-indigo-400">
                                            ₹{((pricingData.baseRatePerKm * 20) + (pricingData.ratePerKg * 10)).toFixed(0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/50 mb-1">With Group Discount</p>
                                        <p className="text-xl font-bold text-green-400">
                                            -{pricingData.groupDiscountPercentage}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <button onClick={handleSavePricing} disabled={saving} className="btn-primary flex items-center gap-2">
                                    {saving ? "Saving..." : <><FaCheck /> Save Pricing</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Hiring Settings */}
                    {activeSection === "hiring" && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <FaUserPlus className="text-purple-400" /> Hiring Settings
                            </h2>

                            <div className="space-y-6">
                                {/* Toggle */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                                    <div>
                                        <p className="font-medium text-white">Currently Hiring</p>
                                        <p className="text-sm text-white/60">Show your company in the jobs portal for delivery agents</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" name="isHiring" checked={hiringData.isHiring} onChange={handleHiringChange} className="sr-only peer" />
                                        <div className="w-14 h-7 bg-white/20 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-500/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600 shadow-inner"></div>
                                    </label>
                                </div>

                                {hiringData.isHiring && (
                                    <div className="space-y-4 p-4 bg-purple-500/20 rounded-xl border border-purple-500/30">
                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Open Positions</label>
                                            <input
                                                type="number"
                                                name="openPositions"
                                                className="w-32 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                min="1"
                                                value={hiringData.openPositions}
                                                onChange={handleHiringChange}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-white mb-1.5">Min Salary (₹/month)</label>
                                                <input
                                                    type="number"
                                                    name="salaryRangeMin"
                                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    min="0"
                                                    value={hiringData.salaryRangeMin}
                                                    onChange={handleHiringChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-white mb-1.5">Max Salary (₹/month)</label>
                                                <input
                                                    type="number"
                                                    name="salaryRangeMax"
                                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    min="0"
                                                    value={hiringData.salaryRangeMax}
                                                    onChange={handleHiringChange}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white mb-1.5">Job Requirements</label>
                                            <textarea
                                                name="requirements"
                                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                rows={3}
                                                value={hiringData.requirements}
                                                onChange={handleHiringChange}
                                                placeholder="e.g., Valid driving license, Own vehicle, 2+ years experience..."
                                            />
                                        </div>

                                        {/* Preview */}
                                        <div className="p-4 bg-white/10 rounded-lg border border-white/20">
                                            <p className="text-xs text-white/50 mb-1">Job Listing Preview</p>
                                            <p className="font-semibold text-white">{hiringData.openPositions} Delivery Agent Position{hiringData.openPositions > 1 ? "s" : ""}</p>
                                            <p className="text-sm text-green-400 font-medium">
                                                ₹{hiringData.salaryRangeMin.toLocaleString()} - ₹{hiringData.salaryRangeMax.toLocaleString()}/month
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <button onClick={handleSaveHiring} disabled={saving} className="btn-primary flex items-center gap-2">
                                    {saving ? "Saving..." : <><FaCheck /> Save Hiring Settings</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Service Cities */}
                    {activeSection === "cities" && (
                        <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20">
                            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-orange-400" /> Service Cities
                            </h2>

                            <div className="bg-orange-500/20 rounded-lg p-4 border border-orange-500/30 mb-6 flex items-start gap-3">
                                <FaInfoCircle className="text-orange-400 mt-0.5" />
                                <p className="text-sm text-orange-300">
                                    Add all cities where your company provides delivery services. Customers in these cities will be able to select your company.
                                </p>
                            </div>

                            <div className="flex gap-2 mb-6">
                                <input
                                    type="text"
                                    value={newCity}
                                    onChange={(e) => setNewCity(e.target.value)}
                                    placeholder="Enter city name..."
                                    className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                    onKeyDown={(e) => e.key === "Enter" && addServiceCity()}
                                />
                                <button onClick={addServiceCity} className="btn-primary px-4">
                                    <FaPlus />
                                </button>
                            </div>

                            {serviceCities.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {serviceCities.map((city) => (
                                        <span key={city} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-300 rounded-full text-sm font-medium border border-orange-500/30">
                                            <FaMapMarkerAlt className="text-xs" />
                                            {city}
                                            <button onClick={() => removeServiceCity(city)} className="hover:text-red-400 transition">
                                                <FaTimes className="text-xs" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-white/40">
                                    <FaMapMarkerAlt className="text-4xl mx-auto mb-2" />
                                    <p>No service cities added yet</p>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10">
                                <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
                                    {saving ? "Saving..." : <><FaCheck /> Save Cities</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
