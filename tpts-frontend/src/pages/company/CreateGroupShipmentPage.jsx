import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../../services/companyService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaBox, FaMapMarkerAlt, FaPercent, FaCalendar, FaArrowRight, FaWarehouse } from "react-icons/fa";
import AddressInput from "../../components/common/AddressInput";

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
        maxParcels: 5,
        closingDate: "",
    });

    // Warehouse address state (separate for AddressInput component)
    // Note: AddressInput returns { addressLine, city, pincode, lat, lng }
    const [warehouseAddress, setWarehouseAddress] = useState({
        addressLine: "",
        city: "",
        pincode: "",
        lat: null,
        lng: null
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
        if (formData.discountPercentage < 0 || formData.discountPercentage > 50) {
            newErrors.discountPercentage = "Discount must be between 0-50%";
        }
        if (formData.maxParcels < 2 || formData.maxParcels > 100) {
            newErrors.maxParcels = "Members must be between 2-100";
        }
        if (formData.closingDate) {
            const closing = new Date(formData.closingDate);
            closing.setHours(23, 59, 59);
            const hoursUntilDeadline = Math.ceil((closing - new Date()) / (1000 * 60 * 60));
            if (closing <= new Date()) {
                newErrors.closingDate = "Closing date must be in the future";
            } else if (hoursUntilDeadline > 168) {
                newErrors.closingDate = "Closing date must be within 7 days";
            }
        }
        // Validate warehouse address - use addressLine (not address) from AddressInput
        if (!warehouseAddress.addressLine) {
            newErrors.warehouseAddress = "Warehouse address is required";
        }
        if (!warehouseAddress.city) {
            newErrors.warehouseCity = "Warehouse city is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            // Calculate deadline hours from closing date
            const closingDateTime = new Date(formData.closingDate);
            closingDateTime.setHours(23, 59, 59); // End of closing date
            const hoursUntilDeadline = Math.ceil((closingDateTime - new Date()) / (1000 * 60 * 60));

            const groupData = {
                sourceCity: formData.sourceCity,
                targetCity: formData.targetCity,
                targetMembers: formData.maxParcels,
                discountPercentage: formData.discountPercentage,
                deadlineHours: Math.max(6, hoursUntilDeadline), // Minimum 6 hours
                warehouseAddress: warehouseAddress.addressLine,
                warehouseCity: warehouseAddress.city,
                warehousePincode: warehouseAddress.pincode,
                warehouseLatitude: warehouseAddress.lat,
                warehouseLongitude: warehouseAddress.lng,
            };
            const result = await createGroup(groupData);
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
        <div className="flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-2xl mb-6">
                <h1 className="text-3xl font-bold text-white">Create Group Shipment</h1>
                <p className="text-sm text-white/60 mt-1">
                    Create a new group shipment route for customers to join with discounts
                </p>
            </div>

            {/* Form */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 border border-white/20 w-full max-w-2xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Route Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <FaMapMarkerAlt className="inline mr-2 text-indigo-400" />
                                Source City *
                            </label>
                            <select
                                name="sourceCity"
                                value={formData.sourceCity}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.sourceCity ? "border-red-500" : "border-white/20"}`}
                            >
                                <option value="" className="bg-slate-800">Select source city</option>
                                {MAJOR_CITIES.map(city => (
                                    <option key={city} value={city} className="bg-slate-800">{city}</option>
                                ))}
                            </select>
                            {errors.sourceCity && (
                                <p className="text-sm text-red-400 mt-1">{errors.sourceCity}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <FaMapMarkerAlt className="inline mr-2 text-green-400" />
                                Target City *
                            </label>
                            <select
                                name="targetCity"
                                value={formData.targetCity}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.targetCity ? "border-red-500" : "border-white/20"}`}
                            >
                                <option value="" className="bg-slate-800">Select target city</option>
                                {MAJOR_CITIES.map(city => (
                                    <option key={city} value={city} className="bg-slate-800">{city}</option>
                                ))}
                            </select>
                            {errors.targetCity && (
                                <p className="text-sm text-red-400 mt-1">{errors.targetCity}</p>
                            )}
                        </div>
                    </div>

                    {/* Route Preview */}
                    {formData.sourceCity && formData.targetCity && (
                        <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg p-4 flex items-center justify-center gap-4">
                            <span className="font-semibold text-indigo-300">{formData.sourceCity}</span>
                            <FaArrowRight className="text-indigo-400" />
                            <span className="font-semibold text-indigo-300">{formData.targetCity}</span>
                        </div>
                    )}

                    {/* Discount & Capacity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <FaPercent className="inline mr-2 text-orange-400" />
                                Discount Percentage *
                            </label>
                            <input
                                type="number"
                                name="discountPercentage"
                                value={formData.discountPercentage}
                                onChange={handleChange}
                                min="0"
                                max="50"
                                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.discountPercentage ? "border-red-500" : "border-white/20"}`}
                            />
                            {errors.discountPercentage && (
                                <p className="text-sm text-red-400 mt-1">{errors.discountPercentage}</p>
                            )}
                            <p className="text-xs text-white/50 mt-1">Discount for customers joining this group (0-50%)</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white mb-2">
                                <FaBox className="inline mr-2 text-purple-400" />
                                Max Parcels
                            </label>
                            <input
                                type="number"
                                name="maxParcels"
                                value={formData.maxParcels}
                                onChange={handleChange}
                                min="2"
                                max="100"
                                className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.maxParcels ? "border-red-500" : "border-white/20"}`}
                            />
                            {errors.maxParcels && (
                                <p className="text-sm text-red-400 mt-1">{errors.maxParcels}</p>
                            )}
                            <p className="text-xs text-white/50 mt-1">Maximum parcels in this group (2-100)</p>
                        </div>
                    </div>

                    {/* Closing Date */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            <FaCalendar className="inline mr-2 text-blue-400" />
                            Closing Date
                        </label>
                        <input
                            type="date"
                            name="closingDate"
                            value={formData.closingDate}
                            onChange={handleChange}
                            className={`w-full px-4 py-3 bg-white/10 border rounded-xl text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${errors.closingDate ? "border-red-500" : "border-white/20"}`}
                        />
                        {errors.closingDate && (
                            <p className="text-sm text-red-400 mt-1">{errors.closingDate}</p>
                        )}
                        <p className="text-xs text-white/50 mt-1">
                            Group will close for new joiners after this date
                        </p>
                    </div>

                    {/* Warehouse Address */}
                    <div className="border-t border-white/10 pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <FaWarehouse className="text-amber-400" />
                            Warehouse / Sorting Facility
                        </h3>
                        <p className="text-sm text-white/60 mb-4">
                            Agent 1 will collect all parcels and bring them to this location. Agent 2 will pick up from here for final delivery.
                        </p>
                        <AddressInput
                            value={warehouseAddress}
                            onChange={(address) => {
                                setWarehouseAddress(address);
                                setErrors(prev => ({ ...prev, warehouseAddress: "", warehouseCity: "" }));
                            }}
                            placeholder="Enter warehouse/sorting facility address..."
                            label="Warehouse Address"
                            required={true}
                            type="pickup"
                        />
                        {(errors.warehouseAddress || errors.warehouseCity) && (
                            <p className="text-sm text-red-400 mt-2">
                                {errors.warehouseAddress || errors.warehouseCity}
                            </p>
                        )}
                    </div>

                    {/* Submit */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate("/company/shipments")}
                            className="flex-1 px-6 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition font-medium"
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
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 w-full max-w-2xl mt-6">
                <h3 className="font-semibold text-blue-300 mb-2">How Group Shipments Work</h3>
                <ul className="text-sm text-blue-200 space-y-2">
                    <li>• Customers on the same route can join your group and get a discount</li>
                    <li>• All parcels are collected by Agent 1, transported to your office</li>
                    <li>• Agent 2 delivers all parcels in the destination city</li>
                    <li>• You earn more by batching deliveries efficiently</li>
                </ul>
            </div>
        </div>
    );
}
