import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
    FaBox, FaUsers, FaPercent, FaClock, FaMapMarkerAlt,
    FaSpinner, FaArrowRight, FaEye, FaSignOutAlt, FaCheckCircle,
    FaTruck, FaWarehouse, FaPhone, FaRupeeSign, FaWeight, FaClipboardList,
    FaExclamationTriangle, FaCreditCard
} from "react-icons/fa";
import { getMyGroupShipments, leaveGroup } from "../../services/parcelService";
import { logout } from "../../utils/auth";
import {
    loadRazorpayScript,
    createBalancePaymentOrder,
    verifyBalancePayment,
    openRazorpayCheckout
} from "../../services/paymentService";


const STATUS_CONFIG = {
    OPEN: { label: "Open", bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    PARTIAL: { label: "Partial", bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
    FULL: { label: "Full", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
    PICKUP_IN_PROGRESS: { label: "Pickup Started", bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
    PICKUP_COMPLETE: { label: "At Warehouse", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    AT_WAREHOUSE: { label: "At Warehouse", bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
    DELIVERY_IN_PROGRESS: { label: "Out for Delivery", bg: "bg-indigo-500/20", text: "text-indigo-400", border: "border-indigo-500/30" },
    COMPLETED: { label: "Completed", bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
    CANCELLED: { label: "Cancelled", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
    EXPIRED: { label: "Expired", bg: "bg-white/10", text: "text-white/60", border: "border-white/20" }
};

export default function MyGroupsPage() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leavingId, setLeavingId] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [payingBalanceId, setPayingBalanceId] = useState(null);

    useEffect(() => {
        fetchMyGroups();
    }, []);

    const fetchMyGroups = async () => {
        try {
            const data = await getMyGroupShipments();
            setGroups(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load groups");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveGroup = async (groupId, parcelId) => {
        if (!window.confirm("Are you sure you want to leave this group? Your parcel will be removed and you'll lose the group discount.")) {
            return;
        }

        setLeavingId(groupId);
        try {
            await leaveGroup(groupId, parcelId);
            toast.success("Left the group successfully");
            fetchMyGroups();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to leave group");
        } finally {
            setLeavingId(null);
        }
    };

    const getStatusBadge = (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
                {config.label}
            </span>
        );
    };

    const canLeave = (group) => {
        return group.status === "OPEN" && new Date(group.deadline) > new Date();
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const handlePayBalance = async (group) => {
        setPayingBalanceId(group.parcelId);
        try {
            // Load Razorpay script
            const loaded = await loadRazorpayScript();
            if (!loaded) {
                throw new Error("Failed to load payment gateway");
            }

            // Create balance payment order
            const orderData = await createBalancePaymentOrder(group.parcelId);

            // Open Razorpay checkout
            const paymentResponse = await openRazorpayCheckout({
                key: orderData.keyId,
                amount: orderData.amountInPaise,
                currency: orderData.currency,
                name: "TPTS",
                description: `Balance Payment - ${group.trackingNumber}`,
                order_id: orderData.orderId,
                prefill: {
                    name: orderData.customerName,
                    email: orderData.customerEmail,
                    contact: orderData.customerPhone
                },
                theme: {
                    color: "#4F46E5"
                }
            });

            // Verify payment
            await verifyBalancePayment(group.parcelId, {
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature
            });

            toast.success("Balance paid successfully!");
            fetchMyGroups(); // Refresh to update balance status
        } catch (err) {
            if (err.message !== "Payment cancelled by user") {
                toast.error(err.response?.data?.message || err.message || "Payment failed");
            }
        } finally {
            setPayingBalanceId(null);
        }
    };

    const hasBalanceDue = (group) => {
        return group.balanceAmount && parseFloat(group.balanceAmount) > 0 && !group.balancePaid;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <FaSpinner className="animate-spin text-3xl text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-white shadow-lg border border-white/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                            <FaUsers className="text-3xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">My Group Shipments</h1>
                            <p className="text-white/80 mt-1">Track your group buy shipments and discounts</p>
                        </div>
                    </div>
                    <Link
                        to="/customer/new-shipment"
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition flex items-center gap-2"
                    >
                        <FaBox /> New Shipment
                    </Link>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">Total Groups</p>
                        <p className="text-2xl font-bold">{groups.length}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">In Progress</p>
                        <p className="text-2xl font-bold">
                            {groups.filter(g => !["COMPLETED", "CANCELLED"].includes(g.status)).length}
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4">
                        <p className="text-white/70 text-sm">Total Savings</p>
                        <p className="text-2xl font-bold">
                            ₹{groups.reduce((sum, g) => sum + (parseFloat(g.yourSavings) || 0), 0).toFixed(0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Groups List */}
            {groups.length === 0 ? (
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-8 text-center border border-white/20">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaUsers className="text-2xl text-white/40" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">No Group Shipments</h3>
                    <p className="text-white/60 text-sm mb-4">
                        You haven't joined any group shipments yet. Join a group to get discounted shipping!
                    </p>
                    <Link
                        to="/customer/new-shipment"
                        className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:underline"
                    >
                        Create a shipment <FaArrowRight />
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {groups.map((group) => (
                        <div
                            key={group.parcelId}
                            className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden"
                        >
                            {/* Header */}
                            <div
                                className="p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition"
                                onClick={() => toggleExpand(group.parcelId)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                            <FaBox className="text-indigo-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-white">
                                                    {group.groupCode}
                                                </span>
                                                {getStatusBadge(group.status)}
                                            </div>
                                            <p className="text-sm text-white/60">
                                                {group.companyName} • {group.trackingNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-green-400 font-bold text-lg">
                                            -{group.discountPercentage}%
                                        </p>
                                        <p className="text-xs text-white/50">savings</p>
                                    </div>
                                </div>
                            </div>

                            {/* Route */}
                            <div className="p-4 flex items-center justify-between bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <FaMapMarkerAlt className="text-indigo-400 mx-auto mb-1" />
                                        <p className="text-sm font-medium text-white">{group.sourceCity}</p>
                                    </div>
                                    <FaArrowRight className="text-white/40" />
                                    <div className="text-center">
                                        <FaWarehouse className="text-amber-400 mx-auto mb-1" />
                                        <p className="text-xs text-white/50">Warehouse</p>
                                    </div>
                                    <FaArrowRight className="text-white/40" />
                                    <div className="text-center">
                                        <FaMapMarkerAlt className="text-green-400 mx-auto mb-1" />
                                        <p className="text-sm font-medium text-white">{group.targetCity}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-white/50">Members</p>
                                    <p className="font-semibold text-white">
                                        {group.currentMembers}/{group.targetMembers}
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="px-4 py-2 bg-white/5">
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                                        style={{ width: `${(group.currentMembers / group.targetMembers) * 100}%` }}
                                    />
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === group.parcelId && (
                                <div className="p-4 border-t border-white/10 space-y-4">
                                    {/* Sender & Receiver Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <FaTruck className="text-orange-400" /> Sender Details
                                            </h4>
                                            <p className="font-medium text-white">{group.pickupName}</p>
                                            <p className="text-sm text-white/60">{group.pickupAddress}</p>
                                            <p className="text-sm text-white/60">{group.pickupCity} - {group.pickupPincode}</p>
                                            <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                                                <FaPhone className="text-xs" /> {group.pickupPhone}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <FaMapMarkerAlt className="text-green-400" /> Receiver Details
                                            </h4>
                                            <p className="font-medium text-white">{group.deliveryName}</p>
                                            <p className="text-sm text-white/60">{group.deliveryAddress}</p>
                                            <p className="text-sm text-white/60">{group.deliveryCity} - {group.deliveryPincode}</p>
                                            <p className="text-sm text-white/60 flex items-center gap-1 mt-1">
                                                <FaPhone className="text-xs" /> {group.deliveryPhone}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Package & Payment Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <FaClipboardList className="text-blue-400" /> Package Details
                                            </h4>
                                            <div className="space-y-1 text-sm">
                                                <p><span className="text-white/50">Type:</span> <span className="font-medium text-white">{group.packageType || "Standard"}</span></p>
                                                <p><span className="text-white/50">Weight:</span> <span className="font-medium text-white">{group.weightKg} kg</span></p>
                                                {group.packageDescription && (
                                                    <p><span className="text-white/50">Description:</span> <span className="font-medium text-white">{group.packageDescription}</span></p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                                <FaRupeeSign className="text-green-400" /> Payment Details
                                            </h4>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-white/50">Base Price:</span>
                                                    <span className="font-medium text-white">₹{parseFloat(group.basePrice || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-400">
                                                    <span>Group Discount ({group.discountPercentage}%):</span>
                                                    <span className="font-medium">-₹{parseFloat(group.discountAmount || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-white/10 pt-1 font-bold">
                                                    <span className="text-white">Final Amount:</span>
                                                    <span className="text-indigo-400">₹{parseFloat(group.finalPrice || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-green-400 bg-green-500/10 -mx-4 px-4 py-2 mt-2 rounded">
                                                    <span className="font-medium">You Saved:</span>
                                                    <span className="font-bold">₹{parseFloat(group.yourSavings || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Balance Due Section (for partial groups) */}
                                    {(hasBalanceDue(group) || group.balancePaid) && (
                                        <div className={`rounded-lg p-4 border-2 ${hasBalanceDue(group) ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
                                            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${hasBalanceDue(group) ? 'text-red-400' : 'text-green-400'}`}>
                                                {hasBalanceDue(group) ? (
                                                    <><FaExclamationTriangle className="text-red-400" /> Balance Payment Required</>
                                                ) : (
                                                    <><FaCheckCircle className="text-green-400" /> Balance Paid</>
                                                )}
                                            </h4>

                                            {/* Pro-rated discount explanation */}
                                            {group.originalDiscountPercentage && group.effectiveDiscountPercentage && (
                                                <div className="mb-3 text-sm">
                                                    <p className="text-white/60">
                                                        Your group reached <strong className="text-white">{group.status === 'PARTIAL' ? 'partial' : 'threshold'}</strong> fill.
                                                        Discount was adjusted:
                                                    </p>
                                                    <div className="flex gap-4 mt-1">
                                                        <span className="text-white/40 line-through">
                                                            Original: {group.originalDiscountPercentage}%
                                                        </span>
                                                        <span className={hasBalanceDue(group) ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                                                            Adjusted: {group.effectiveDiscountPercentage}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-white/60">
                                                        {hasBalanceDue(group) ? 'Amount Due:' : 'Paid Amount:'}
                                                    </p>
                                                    <p className={`text-2xl font-bold ${hasBalanceDue(group) ? 'text-red-400' : 'text-green-400'}`}>
                                                        ₹{parseFloat(group.balanceAmount || 0).toFixed(2)}
                                                    </p>
                                                </div>

                                                {hasBalanceDue(group) ? (
                                                    <button
                                                        onClick={() => handlePayBalance(group)}
                                                        disabled={payingBalanceId === group.parcelId}
                                                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 transition"
                                                    >
                                                        {payingBalanceId === group.parcelId ? (
                                                            <><FaSpinner className="animate-spin" /> Processing...</>
                                                        ) : (
                                                            <><FaCreditCard /> Pay Now</>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <div className="text-right">
                                                        <p className="text-xs text-white/50">Paid via {group.balancePaymentMethod}</p>
                                                        <p className="text-xs text-white/50">
                                                            {group.balancePaidAt && new Date(group.balancePaidAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {hasBalanceDue(group) && (
                                                <p className="text-xs text-white/50 mt-2">
                                                    💡 You can pay now or pay cash to the delivery agent when receiving your parcel.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Warehouse Info */}
                                    {group.warehouseAddress && (
                                        <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/30">
                                            <h4 className="font-semibold text-amber-400 mb-1 flex items-center gap-2">
                                                <FaWarehouse className="text-amber-400" /> Warehouse
                                            </h4>
                                            <p className="text-sm text-white/70">{group.warehouseAddress}, {group.warehouseCity}</p>
                                        </div>
                                    )}

                                    {/* Agent Info */}
                                    {(group.pickupAgent || group.deliveryAgent) && (
                                        <div className="grid grid-cols-2 gap-4">
                                            {group.pickupAgent && (
                                                <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/30">
                                                    <h4 className="font-semibold text-orange-400 mb-1 flex items-center gap-2">
                                                        <FaTruck className="text-orange-400" /> Pickup Agent
                                                    </h4>
                                                    <p className="font-medium text-white">{group.pickupAgent.name}</p>
                                                    <p className="text-sm text-white/60 flex items-center gap-1">
                                                        <FaPhone className="text-xs" /> {group.pickupAgent.phone}
                                                    </p>
                                                </div>
                                            )}
                                            {group.deliveryAgent && (
                                                <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                                                    <h4 className="font-semibold text-green-400 mb-1 flex items-center gap-2">
                                                        <FaTruck className="text-green-400" /> Delivery Agent
                                                    </h4>
                                                    <p className="font-medium text-white">{group.deliveryAgent.name}</p>
                                                    <p className="text-sm text-white/60 flex items-center gap-1">
                                                        <FaPhone className="text-xs" /> {group.deliveryAgent.phone}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Revenue Split (shown for completed orders) */}
                                    {group.revenueSplit && (
                                        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/30">
                                            <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                                                <FaPercent className="text-purple-400" /> Revenue Split
                                            </h4>
                                            <div className="grid grid-cols-4 gap-2 text-center text-sm">
                                                <div className="bg-white/5 rounded-lg p-2">
                                                    <p className="text-white/50">Platform</p>
                                                    <p className="font-bold text-purple-400">₹{parseFloat(group.revenueSplit.platformFee).toFixed(2)}</p>
                                                    <p className="text-xs text-white/40">10%</p>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-2">
                                                    <p className="text-white/50">Pickup Agent</p>
                                                    <p className="font-bold text-orange-400">₹{parseFloat(group.revenueSplit.pickupAgentFee).toFixed(2)}</p>
                                                    <p className="text-xs text-white/40">10%</p>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-2">
                                                    <p className="text-white/50">Delivery Agent</p>
                                                    <p className="font-bold text-green-400">₹{parseFloat(group.revenueSplit.deliveryAgentFee).toFixed(2)}</p>
                                                    <p className="text-xs text-white/40">10%</p>
                                                </div>
                                                <div className="bg-white/5 rounded-lg p-2">
                                                    <p className="text-white/50">Company</p>
                                                    <p className="font-bold text-blue-400">₹{parseFloat(group.revenueSplit.companyEarning).toFixed(2)}</p>
                                                    <p className="text-xs text-white/40">70%</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    {(group.pickedUpAt || group.deliveredAt) && (
                                        <div className="flex gap-4 text-sm text-white/60">
                                            {group.pickedUpAt && (
                                                <span>Picked up: {new Date(group.pickedUpAt).toLocaleString()}</span>
                                            )}
                                            {group.deliveredAt && (
                                                <span>Delivered: {new Date(group.deliveredAt).toLocaleString()}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Stats Row */}
                            <div className="p-4 grid grid-cols-3 gap-4 text-center text-sm border-t border-white/10">
                                <div>
                                    <FaClock className="text-white/40 mx-auto mb-1" />
                                    <p className="text-white/50">Deadline</p>
                                    <p className="font-medium text-white">
                                        {new Date(group.deadline).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <FaUsers className="text-white/40 mx-auto mb-1" />
                                    <p className="text-white/50">Slots left</p>
                                    <p className="font-medium text-white">{group.remainingSlots}</p>
                                </div>
                                <div>
                                    <FaPercent className="text-white/40 mx-auto mb-1" />
                                    <p className="text-white/50">You save</p>
                                    <p className="font-medium text-green-400">₹{parseFloat(group.yourSavings || 0).toFixed(0)}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-4 border-t border-white/10 flex gap-3">
                                {group.parcelId && (
                                    <Link
                                        to={`/customer/group-tracking/${group.parcelId}`}
                                        className={`flex-1 ${group.status === "COMPLETED" ? "bg-white/10" : "bg-indigo-600"} text-white py-2 px-4 rounded-lg text-center font-medium flex items-center justify-center gap-2 hover:opacity-90 transition`}
                                    >
                                        {group.status === "COMPLETED" ? (
                                            <><FaCheckCircle /> View Details</>
                                        ) : (
                                            <><FaEye /> Track Package</>
                                        )}
                                    </Link>
                                )}
                                <button
                                    onClick={() => toggleExpand(group.parcelId)}
                                    className="px-4 py-2 border border-white/20 text-white/70 rounded-lg hover:bg-white/10 transition"
                                >
                                    {expandedId === group.parcelId ? "Less" : "More"} Details
                                </button>
                                {canLeave(group) && group.parcelId && (
                                    <button
                                        onClick={() => handleLeaveGroup(group.id, group.parcelId)}
                                        disabled={leavingId === group.id}
                                        className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 flex items-center gap-2 disabled:opacity-50 transition"
                                    >
                                        {leavingId === group.id ? (
                                            <FaSpinner className="animate-spin" />
                                        ) : (
                                            <FaSignOutAlt />
                                        )}
                                        Leave
                                    </button>
                                )}
                                {group.status === "COMPLETED" && (
                                    <span className="flex-1 bg-green-500/20 text-green-400 py-2 px-4 rounded-lg text-center font-medium flex items-center justify-center gap-2 border border-green-500/30">
                                        <FaCheckCircle /> Delivered
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
