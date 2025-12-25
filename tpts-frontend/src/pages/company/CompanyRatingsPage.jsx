import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyRatings, getUnrespondedRatings, respondToRating, flagRating } from "../../services/ratingService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaStar, FaReply, FaFlag, FaUser, FaFilter, FaComment, FaSync, FaTruck, FaCalendar, FaThumbsUp, FaThumbsDown } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const ITEMS_PER_PAGE = 8;

export default function CompanyRatingsPage() {
    const navigate = useNavigate();
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [selectedRating, setSelectedRating] = useState(null);
    const [responseText, setResponseText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchRatings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const fetchRatings = async () => {
        setLoading(true);
        try {
            const data = await getCompanyRatings();
            setRatings(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load ratings");
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredRatings = ratings.filter(rating => {
        if (filter === "all") return true;
        if (filter === "unresponded") return !rating.companyResponse;
        if (filter === "positive") return rating.companyRating >= 4;
        if (filter === "negative") return rating.companyRating <= 2;
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredRatings.length / ITEMS_PER_PAGE);
    const paginatedRatings = filteredRatings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleRespond = async () => {
        if (!selectedRating || !responseText.trim()) return;

        setSubmitting(true);
        try {
            await respondToRating(selectedRating.id, { response: responseText });
            toast.success("Response added successfully");
            setSelectedRating(null);
            setResponseText("");
            fetchRatings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add response");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFlag = async (ratingId) => {
        const reason = prompt("Enter reason for flagging this review:");
        if (!reason) return;

        try {
            await flagRating(ratingId, reason);
            toast.success("Rating flagged for review");
            fetchRatings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to flag rating");
        }
    };

    const renderStars = (rating, size = "text-base") => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`${size} ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
                    />
                ))}
            </div>
        );
    };

    // Calculate stats
    const stats = {
        total: ratings.length,
        avgRating: ratings.length > 0
            ? (ratings.reduce((sum, r) => sum + (r.companyRating || 0), 0) / ratings.length).toFixed(1)
            : "0.0",
        unresponded: ratings.filter(r => !r.companyResponse).length,
        positive: ratings.filter(r => r.companyRating >= 4).length,
        negative: ratings.filter(r => r.companyRating <= 2).length,
    };

    if (loading && ratings.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading ratings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Customer Ratings</h1>
                    <p className="text-sm text-gray-500 mt-1">View and respond to customer feedback</p>
                </div>
                <button
                    onClick={fetchRatings}
                    disabled={loading}
                    className="btn-outline flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl p-5 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <FaStar className="text-2xl" />
                        <span className="text-4xl font-bold">{stats.avgRating}</span>
                    </div>
                    <p className="text-yellow-100 text-sm">Average Rating</p>
                </div>
                <StatCard
                    label="Total Reviews"
                    value={stats.total}
                    icon={FaComment}
                    color="indigo"
                    active={filter === "all"}
                    onClick={() => setFilter("all")}
                />
                <StatCard
                    label="Needs Response"
                    value={stats.unresponded}
                    icon={FaReply}
                    color="orange"
                    active={filter === "unresponded"}
                    onClick={() => setFilter("unresponded")}
                />
                <StatCard
                    label="Positive (4-5★)"
                    value={stats.positive}
                    icon={FaThumbsUp}
                    color="green"
                    active={filter === "positive"}
                    onClick={() => setFilter("positive")}
                />
                <StatCard
                    label="Negative (1-2★)"
                    value={stats.negative}
                    icon={FaThumbsDown}
                    color="red"
                    active={filter === "negative"}
                    onClick={() => setFilter("negative")}
                />
            </div>

            {/* Ratings List */}
            {paginatedRatings.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaStar className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Found</h3>
                    <p className="text-sm text-gray-500">
                        {filter !== "all" ? "No reviews match this filter" : "No customer reviews yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedRatings.map((rating) => (
                        <RatingCard
                            key={rating.id}
                            rating={rating}
                            renderStars={renderStars}
                            onRespond={() => setSelectedRating(rating)}
                            onFlag={() => handleFlag(rating.id)}
                        />
                    ))}

                    {/* Pagination */}
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredRatings.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                    />
                </div>
            )}

            {/* Response Modal */}
            {selectedRating && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <FaComment className="text-primary-600" /> Respond to Review
                        </h3>

                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                {renderStars(selectedRating.companyRating)}
                                <span className="text-sm text-gray-500">by {selectedRating.customerName}</span>
                            </div>
                            {selectedRating.reviewText && (
                                <p className="text-sm text-gray-700 italic">"{selectedRating.reviewText}"</p>
                            )}
                        </div>

                        <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="Write a professional response to this review..."
                            rows={4}
                            className="input mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedRating(null);
                                    setResponseText("");
                                }}
                                className="btn-outline flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRespond}
                                disabled={!responseText.trim() || submitting}
                                className="btn-primary flex-1"
                            >
                                {submitting ? "Sending..." : "Send Response"}
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
        indigo: { bg: "bg-indigo-50", text: "text-indigo-600", activeBg: "bg-indigo-100", border: "border-indigo-200" },
        orange: { bg: "bg-orange-50", text: "text-orange-600", activeBg: "bg-orange-100", border: "border-orange-200" },
        green: { bg: "bg-green-50", text: "text-green-600", activeBg: "bg-green-100", border: "border-green-200" },
        red: { bg: "bg-red-50", text: "text-red-600", activeBg: "bg-red-100", border: "border-red-200" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 ${active ? `${c.activeBg} ${c.border} ring-2 ring-offset-1 ring-primary-500` : `bg-white border-gray-200 hover:shadow-md`
                }`}
        >
            <Icon className={`text-xl ${c.text} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${active ? c.text : "text-gray-900"}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
        </button>
    );
}

function RatingCard({ rating, renderStars, onRespond, onFlag }) {
    const isPositive = rating.companyRating >= 4;
    const isNegative = rating.companyRating <= 2;

    return (
        <div className={`bg-white rounded-xl shadow-md border overflow-hidden transition hover:shadow-lg ${isNegative ? "border-l-4 border-l-red-500" :
                isPositive ? "border-l-4 border-l-green-500" :
                    "border-gray-200"
            }`}>
            <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Customer Header */}
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${isPositive ? "bg-green-500" : isNegative ? "bg-red-500" : "bg-gray-400"
                                }`}>
                                {rating.customerName?.charAt(0) || "C"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">{rating.customerName || "Customer"}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {renderStars(rating.companyRating)}
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <FaCalendar />
                                        {new Date(rating.createdAt).toLocaleDateString("en-IN", {
                                            day: 'numeric', month: 'short', year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Review Text */}
                        {rating.reviewText && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                <p className="text-gray-700 italic">"{rating.reviewText}"</p>
                            </div>
                        )}

                        {/* Parcel Info */}
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                                <FaTruck className="text-gray-400" />
                                {rating.trackingNumber}
                            </span>
                            {rating.agentName && (
                                <span>Agent: <strong>{rating.agentName}</strong></span>
                            )}
                        </div>

                        {/* Company Response */}
                        {rating.companyResponse && (
                            <div className="mt-4 pl-4 border-l-3 border-primary-400 bg-primary-50 p-3 rounded-r-lg">
                                <p className="text-xs text-primary-600 font-semibold mb-1">Your Response:</p>
                                <p className="text-sm text-gray-700">{rating.companyResponse}</p>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 lg:w-32">
                        {!rating.companyResponse && (
                            <button
                                onClick={onRespond}
                                className="btn-primary text-sm px-4 py-2 flex items-center justify-center gap-2"
                            >
                                <FaReply /> Respond
                            </button>
                        )}
                        <button
                            onClick={onFlag}
                            className="btn-outline text-sm px-4 py-2 flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <FaFlag /> Flag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
