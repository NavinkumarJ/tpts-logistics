import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getPlatformSettings, updatePlatformSettings, getApprovedCompanies, updateCompanyCommission } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaCog, FaSave, FaPercent, FaRupeeSign, FaBell, FaDatabase, FaBuilding, FaChartLine, FaEdit, FaTimes } from "react-icons/fa";

export default function AdminSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companies, setCompanies] = useState([]);
    const [editingCompanyId, setEditingCompanyId] = useState(null);
    const [editRate, setEditRate] = useState("");
    const [settings, setSettings] = useState({
        defaultCommissionRate: 5,
        minOrderFee: 5,
        maxOrderFee: 500,
        groupBuyMinMembers: 2,
        groupBuyMaxMembers: 50,
        groupBuyDeadlineHours: 72,
        minDeliveryRate: 20,
        maxDeliveryRate: 5000,
        smsProvider: "TWILIO",
        emailProvider: "SENDGRID",
        paymentGateway: "RAZORPAY",
    });

    useEffect(() => {
        fetchSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getPlatformSettings();
            if (data) {
                setSettings({ ...settings, ...data });
            }
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else if (err.response?.status === 409) {
                // Settings not initialized in backend - use defaults
                console.log("Platform settings not initialized, using defaults");
            } else {
                toast.error("Failed to load settings");
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchCompanies = async () => {
        try {
            const data = await getApprovedCompanies();
            setCompanies(data || []);
        } catch (err) {
            console.log("Could not fetch companies");
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleUpdateCompanyRate = async (companyId) => {
        const rate = parseFloat(editRate);
        if (isNaN(rate) || rate < 0 || rate > 50) {
            toast.error("Commission rate must be between 0 and 50%");
            return;
        }
        try {
            await updateCompanyCommission(companyId, rate);
            toast.success("Company commission updated");
            setEditingCompanyId(null);
            setEditRate("");
            fetchCompanies();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update rate");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updatePlatformSettings(settings);
            toast.success("Settings updated successfully");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Configure system-wide settings</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Commission Settings */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaPercent className="text-slate-500" /> Commission Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Default Commission Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="50"
                                value={settings.defaultCommissionRate}
                                onChange={(e) => setSettings({ ...settings, defaultCommissionRate: parseFloat(e.target.value) })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Fee per Order (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.minOrderFee}
                                onChange={(e) => setSettings({ ...settings, minOrderFee: parseFloat(e.target.value) })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Fee per Order (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.maxOrderFee}
                                onChange={(e) => setSettings({ ...settings, maxOrderFee: parseFloat(e.target.value) })}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Company-Specific Rates */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaBuilding className="text-slate-500" /> Company-Specific Rates
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Set custom commission rates for individual companies. Default rate applies if not specified.
                    </p>

                    {companies.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No approved companies found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Company</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Orders</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Revenue</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Rate (%)</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {companies.slice(0, 10).map((company) => (
                                        <tr key={company.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{company.name}</p>
                                                <p className="text-xs text-gray-500">{company.city}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{company.totalOrders || 0}</td>
                                            <td className="px-4 py-3 text-gray-600">₹{(company.totalRevenue || 0).toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                {editingCompanyId === company.id ? (
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="50"
                                                        value={editRate}
                                                        onChange={(e) => setEditRate(e.target.value)}
                                                        className="input w-20 text-sm"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${company.commissionRate !== settings.defaultCommissionRate
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-gray-100 text-gray-800"
                                                        }`}>
                                                        {company.commissionRate || settings.defaultCommissionRate}%
                                                        {company.commissionRate !== settings.defaultCommissionRate && " (Custom)"}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {editingCompanyId === company.id ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateCompanyRate(company.id)}
                                                            className="text-green-600 hover:text-green-700"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => { setEditingCompanyId(null); setEditRate(""); }}
                                                            className="text-gray-600 hover:text-gray-700"
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingCompanyId(company.id);
                                                            setEditRate(company.commissionRate || settings.defaultCommissionRate);
                                                        }}
                                                        className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                    >
                                                        <FaEdit /> Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Revenue Impact Preview */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h4 className="font-medium text-green-800 flex items-center gap-2 mb-2">
                            <FaChartLine /> Revenue Impact Preview
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Est. Monthly Orders</p>
                                <p className="text-lg font-bold text-gray-900">~{companies.reduce((sum, c) => sum + (c.totalOrders || 0), 0) * 4}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Est. Monthly GMV</p>
                                <p className="text-lg font-bold text-gray-900">₹{(companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) * 4).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Platform Fee ({settings.defaultCommissionRate}%)</p>
                                <p className="text-lg font-bold text-green-600">
                                    ₹{Math.round(companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) * 4 * settings.defaultCommissionRate / 100).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-500">Annualized</p>
                                <p className="text-lg font-bold text-green-700">
                                    ₹{Math.round(companies.reduce((sum, c) => sum + (c.totalRevenue || 0), 0) * 48 * settings.defaultCommissionRate / 100).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Group Buy Settings */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaDatabase className="text-slate-500" /> Group Buy Rules
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Members per Group
                            </label>
                            <input
                                type="number"
                                min="2"
                                value={settings.groupBuyMinMembers}
                                onChange={(e) => setSettings({ ...settings, groupBuyMinMembers: parseInt(e.target.value) })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Members per Group
                            </label>
                            <input
                                type="number"
                                min="2"
                                value={settings.groupBuyMaxMembers}
                                onChange={(e) => setSettings({ ...settings, groupBuyMaxMembers: parseInt(e.target.value) })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deadline Limit (hours)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={settings.groupBuyDeadlineHours}
                                onChange={(e) => setSettings({ ...settings, groupBuyDeadlineHours: parseInt(e.target.value) })}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Pricing Settings */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaRupeeSign className="text-slate-500" /> Delivery Pricing Limits
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min Delivery Rate (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.minDeliveryRate}
                                onChange={(e) => setSettings({ ...settings, minDeliveryRate: parseFloat(e.target.value) })}
                                className="input"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max Delivery Rate (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.maxDeliveryRate}
                                onChange={(e) => setSettings({ ...settings, maxDeliveryRate: parseFloat(e.target.value) })}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                {/* Integration Settings */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FaBell className="text-slate-500" /> Integration Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                SMS Provider
                            </label>
                            <select
                                value={settings.smsProvider}
                                onChange={(e) => setSettings({ ...settings, smsProvider: e.target.value })}
                                className="input"
                            >
                                <option value="TWILIO">Twilio</option>
                                <option value="MSG91">MSG91</option>
                                <option value="TEXTLOCAL">TextLocal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Provider
                            </label>
                            <select
                                value={settings.emailProvider}
                                onChange={(e) => setSettings({ ...settings, emailProvider: e.target.value })}
                                className="input"
                            >
                                <option value="SENDGRID">SendGrid</option>
                                <option value="MAILGUN">Mailgun</option>
                                <option value="SES">AWS SES</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Gateway
                            </label>
                            <select
                                value={settings.paymentGateway}
                                onChange={(e) => setSettings({ ...settings, paymentGateway: e.target.value })}
                                className="input"
                            >
                                <option value="RAZORPAY">Razorpay</option>
                                <option value="PAYTM">Paytm</option>
                                <option value="PHONEPE">PhonePe</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <FaSave /> {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}
