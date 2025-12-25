import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBox, FaMapMarkerAlt, FaPercent, FaCalendar, FaArrowRight } from "react-icons/fa";

const MAJOR_CITIES = [
    "Chennai", "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Kolkata",
    "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Coimbatore", "Madurai"
];

export default function CreateGroupShipmentPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        sourceCity: "",
        targetCity: "",
        discountPercentage: 10,
        maxParcels: 10,
        closingDate: "",
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: "" }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.sourceCity) newErrors.sourceCity = "Source city is required";
        if (!formData.targetCity) newErrors.targetCity = "Target city is required";
        if (formData.sourceCity === formData.targetCity) {
            newErrors.targetCity = "Target city must be different from source";
        }
        if (formData.discountPercentage < 0 || formData.discountPercentage > 50) {
            newErrors.discountPercentage = "Discount must be between 0-50%";
        }
        if (formData.maxParcels < 2 || formData.maxParcels > 100) {
            newErrors.maxParcels = "Max parcels must be between 2-100";
        }
        if (formData.closingDate) {
            const closing = new Date(formData.closingDate);
            if (closing <= new Date()) {
                newErrors.closingDate = "Closing date must be in the future";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const result = await createGroup(formData);
            toast.success(`Group created! Code: ${result.groupCode}`);
            navigate("/company/shipments");
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error(err.response?.data?.message || "Failed to create group");
            }
        } finally {
            setLoading(false);
        }
    };

    // Set default closing date to 7 days from now
    useEffect(() => {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setFormData(prev => ({
            ...prev,
            closingDate: defaultDate.toISOString().split('T')[0]
        }));
    }, []);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Group Shipment</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Create a new group shipment route for customers to join with discounts
                </p>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-200 max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Route Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaMapMarkerAlt className="inline mr-2 text-indigo-600" />
                                Source City *
                            </label>
                            <select
                                name="sourceCity"
                                value={formData.sourceCity}
                                onChange={handleChange}
                                className={`input ${errors.sourceCity ? "border-red-500" : ""}`}
                            >
                                <option value="">Select source city</option>
                                {MAJOR_CITIES.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            {errors.sourceCity && (
                                <p className="text-sm text-red-600 mt-1">{errors.sourceCity}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaMapMarkerAlt className="inline mr-2 text-green-600" />
                                Target City *
                            </label>
                            <select
                                name="targetCity"
                                value={formData.targetCity}
                                onChange={handleChange}
                                className={`input ${errors.targetCity ? "border-red-500" : ""}`}
                            >
                                <option value="">Select target city</option>
                                {MAJOR_CITIES.filter(c => c !== formData.sourceCity).map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                            {errors.targetCity && (
                                <p className="text-sm text-red-600 mt-1">{errors.targetCity}</p>
                            )}
                        </div>
                    </div>

                    {/* Route Preview */}
                    {formData.sourceCity && formData.targetCity && (
                        <div className="bg-indigo-50 rounded-lg p-4 flex items-center justify-center gap-4">
                            <span className="font-semibold text-indigo-900">{formData.sourceCity}</span>
                            <FaArrowRight className="text-indigo-600" />
                            <span className="font-semibold text-indigo-900">{formData.targetCity}</span>
                        </div>
                    )}

                    {/* Discount & Capacity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaPercent className="inline mr-2 text-orange-600" />
                                Discount Percentage *
                            </label>
                            <input
                                type="number"
                                name="discountPercentage"
                                value={formData.discountPercentage}
                                onChange={handleChange}
                                min="0"
                                max="50"
                                className={`input ${errors.discountPercentage ? "border-red-500" : ""}`}
                            />
                            {errors.discountPercentage && (
                                <p className="text-sm text-red-600 mt-1">{errors.discountPercentage}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Discount for customers joining this group (0-50%)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <FaBox className="inline mr-2 text-purple-600" />
                                Max Parcels
                            </label>
                            <input
                                type="number"
                                name="maxParcels"
                                value={formData.maxParcels}
                                onChange={handleChange}
                                min="2"
                                max="100"
                                className={`input ${errors.maxParcels ? "border-red-500" : ""}`}
                            />
                            {errors.maxParcels && (
                                <p className="text-sm text-red-600 mt-1">{errors.maxParcels}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Maximum parcels in this group (2-100)</p>
                        </div>
                    </div>

                    {/* Closing Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <FaCalendar className="inline mr-2 text-blue-600" />
                            Closing Date
                        </label>
                        <input
                            type="date"
                            name="closingDate"
                            value={formData.closingDate}
                            onChange={handleChange}
                            className={`input ${errors.closingDate ? "border-red-500" : ""}`}
                        />
                        {errors.closingDate && (
                            <p className="text-sm text-red-600 mt-1">{errors.closingDate}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Group will close for new joiners after this date
                        </p>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate("/company/shipments")}
                            className="btn-outline flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex-1"
                        >
                            {loading ? "Creating..." : "Create Group Shipment"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl">
                <h3 className="font-semibold text-blue-900 mb-2">How Group Shipments Work</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                    <li>• Customers on the same route can join your group and get a discount</li>
                    <li>• All parcels are collected by Agent 1, transported to your office</li>
                    <li>• Agent 2 delivers all parcels in the destination city</li>
                    <li>• You earn more by batching deliveries efficiently</li>
                </ul>
            </div>
        </div>
    );
}
