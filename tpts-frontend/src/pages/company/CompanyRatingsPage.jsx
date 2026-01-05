import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCompanyRatings } from "../../services/ratingService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaStar, FaComment, FaSync, FaTruck, FaCalendar, FaThumbsUp, FaThumbsDown, FaBuilding, FaUserTie } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const ITEMS_PER_PAGE = 8;

export default function CompanyRatingsPage() {
    const navigate = useNavigate();
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("company"); // 'company' or 'agents'
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchRatings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reset page when filter or tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, activeTab]);

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

    // Separate ratings based on tab
    // Company ratings: has companyRating value
    const companyRatings = ratings.filter(r => r.companyRating != null);

    // Agent ratings: expand to show pickup and delivery as separate items
    // Each rating can generate up to 2 items (one for pickup, one for delivery)
    const agentRatings = [];
    ratings.forEach(r => {
        // Add pickup agent rating if exists
        if (r.pickupAgentRating != null) {
            agentRatings.push({
                ...r,
                _displayType: 'pickup',
                _ratingValue: r.pickupAgentRating,
                _reviewText: r.pickupAgentReview,
                _agentName: r.pickupAgentName,
                _uniqueKey: `${r.id}-pickup`
            });
        }
        // Add delivery agent rating if exists
        if (r.agentRating != null) {
            agentRatings.push({
                ...r,
                _displayType: 'delivery',
                _ratingValue: r.agentRating,
                _reviewText: r.agentReview,
                _agentName: r.agentName,
                _uniqueKey: `${r.id}-delivery`
            });
        }
    });

    // Sort by date (most recent first)
    agentRatings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Get ratings for current tab
    const currentTabRatings = activeTab === "company" ? companyRatings : agentRatings;

    const filteredRatings = currentTabRatings.filter(rating => {
        let ratingValue;
        if (activeTab === "company") {
            ratingValue = rating.companyRating;
        } else {
            // For agents, use the pre-calculated display value
            ratingValue = rating._ratingValue;
        }
        if (filter === "all") return true;
        if (filter === "positive") return ratingValue >= 4;
        if (filter === "negative") return ratingValue <= 2;
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredRatings.length / ITEMS_PER_PAGE);
    const paginatedRatings = filteredRatings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );



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

    // Calculate stats for the active tab
    const getStats = () => {
        const tabRatings = activeTab === "company" ? companyRatings : agentRatings;

        // For agents, use the pre-calculated _ratingValue; for company use companyRating
        const getRatingValue = (r) => {
            if (activeTab === "company") return r.companyRating;
            return r._ratingValue; // Already set for expanded agent ratings
        };

        const validRatings = tabRatings.filter(r => getRatingValue(r) != null);

        return {
            total: validRatings.length,
            avgRating: validRatings.length > 0
                ? (validRatings.reduce((sum, r) => sum + getRatingValue(r), 0) / validRatings.length).toFixed(1)
                : "0.0",
            positive: validRatings.filter(r => getRatingValue(r) >= 4).length,
            negative: validRatings.filter(r => getRatingValue(r) <= 2).length,
        };
    };

    const stats = getStats();

    if (loading && ratings.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
                <p className="mt-3 text-sm text-white/60">Loading ratings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Ratings & Reviews</h1>
                    <p className="text-sm text-white/60 mt-1">View ratings for your company and agents</p>
                </div>
                <button
                    onClick={fetchRatings}
                    disabled={loading}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition flex items-center gap-2 self-start"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-1.5 inline-flex gap-1 border border-white/20">
                <button
                    onClick={() => setActiveTab("company")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "company"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <FaBuilding />
                    Company Ratings
                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "company" ? "bg-white/20" : "bg-white/10"
                        }`}>
                        {companyRatings.length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("agents")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "agents"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-white/70 hover:bg-white/10"
                        }`}
                >
                    <FaUserTie />
                    Agent Ratings
                    <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "agents" ? "bg-white/20" : "bg-white/10"
                        }`}>
                        {agentRatings.length}
                    </span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="bg-white/10 backdrop-blur-xl rounded-xl p-12 border border-white/20 text-center">
                    <FaStar className="text-5xl text-white/30 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Reviews Found</h3>
                    <p className="text-sm text-white/50">
                        {filter !== "all" ? "No reviews match this filter" : `No ${activeTab === "company" ? "company" : "agent"} reviews yet`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {paginatedRatings.map((rating) => (
                        activeTab === "company" ? (
                            <CompanyRatingCard
                                key={rating.id}
                                rating={rating}
                                renderStars={renderStars}
                            />
                        ) : (
                            <AgentRatingCard
                                key={rating._uniqueKey || rating.id}
                                rating={rating}
                                renderStars={renderStars}
                            />
                        )
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

        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, active, onClick }) {
    const colors = {
        indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400", activeBg: "bg-indigo-500/30", border: "border-indigo-500/30" },
        orange: { bg: "bg-orange-500/20", text: "text-orange-400", activeBg: "bg-orange-500/30", border: "border-orange-500/30" },
        green: { bg: "bg-green-500/20", text: "text-green-400", activeBg: "bg-green-500/30", border: "border-green-500/30" },
        red: { bg: "bg-red-500/20", text: "text-red-400", activeBg: "bg-red-500/30", border: "border-red-500/30" },
    };
    const c = colors[color];

    return (
        <button
            onClick={onClick}
            className={`rounded-xl p-4 text-center transition cursor-pointer border-2 backdrop-blur-sm ${active ? `${c.activeBg} ${c.border} ring-2 ring-offset-1 ring-offset-transparent ring-indigo-500` : `bg-white/10 border-white/20 hover:bg-white/15`
                }`}
        >
            <Icon className={`text-xl ${c.text} mx-auto mb-2`} />
            <p className={`text-2xl font-bold ${active ? c.text : "text-white"}`}>{value}</p>
            <p className="text-xs text-white/60">{label}</p>
        </button>
    );
}

function CompanyRatingCard({ rating, renderStars }) {
    const isPositive = rating.companyRating >= 4;
    const isNegative = rating.companyRating <= 2;

    return (
        <div className={`bg-white/10 backdrop-blur-xl rounded-xl border overflow-hidden transition hover:bg-white/15 ${isNegative ? "border-l-4 border-l-red-500 border-white/20" :
            isPositive ? "border-l-4 border-l-green-500 border-white/20" :
                "border-white/20"
            }`}>
            <div className="p-5">
                {/* Customer Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${isPositive ? "bg-green-500" : isNegative ? "bg-red-500" : "bg-gray-500"
                        }`}>
                        {rating.customerName?.charAt(0) || "C"}
                    </div>
                    <div>
                        <p className="font-semibold text-white">{rating.customerName || "Customer"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(rating.companyRating)}
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <FaCalendar />
                                {new Date(rating.createdAt).toLocaleDateString("en-IN", {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Company Review Text */}
                {rating.companyReview && (
                    <div className="bg-white/5 rounded-lg p-4 mb-3 border border-white/10">
                        <p className="text-white/80 italic">"{rating.companyReview}"</p>
                    </div>
                )}

                {/* Parcel Info */}
                <div className="flex flex-wrap gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                        <FaTruck className="text-white/40" />
                        {rating.trackingNumber}
                    </span>
                    {rating.agentName && (
                        <span>Delivered by: <strong className="text-white/70">{rating.agentName}</strong></span>
                    )}
                </div>
            </div>
        </div>
    );
}

function AgentRatingCard({ rating, renderStars }) {
    // Use pre-calculated properties from expanded rating item
    const isPickupRating = rating._displayType === 'pickup';

    // Get the appropriate rating value and agent info from expanded properties
    const agentRatingValue = rating._ratingValue;
    const agentReviewText = rating._reviewText;
    const agentDisplayName = rating._agentName;
    const agentType = isPickupRating ? "Pickup" : "Delivery";
    const badgeColor = isPickupRating ? "orange" : "blue";

    const isPositive = agentRatingValue >= 4;
    const isNegative = agentRatingValue <= 2;

    return (
        <div className={`bg-white/10 backdrop-blur-xl rounded-xl border overflow-hidden transition hover:bg-white/15 ${isNegative ? "border-l-4 border-l-red-500 border-white/20" :
            isPositive ? "border-l-4 border-l-green-500 border-white/20" :
                "border-white/20"
            }`}>
            <div className="p-5">
                {/* Agent Badge */}
                <div className="mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${badgeColor === "orange"
                        ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                        : "bg-blue-500/20 text-blue-300 border border-blue-500/30"}`}>
                        <FaUserTie />
                        {agentType} Agent: {agentDisplayName || "Agent"}
                    </span>
                </div>

                {/* Customer Header */}
                <div className="flex items-center gap-3 mb-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${isPositive ? "bg-green-500" : isNegative ? "bg-red-500" : "bg-gray-500"
                        }`}>
                        {rating.customerName?.charAt(0) || "C"}
                    </div>
                    <div>
                        <p className="font-semibold text-white">Rated by: {rating.customerName || "Customer"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            {renderStars(agentRatingValue)}
                            <span className="text-xs text-white/50 flex items-center gap-1">
                                <FaCalendar />
                                {new Date(rating.createdAt).toLocaleDateString("en-IN", {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Agent Review Text */}
                {agentReviewText && (
                    <div className="bg-white/5 rounded-lg p-4 mb-3 border border-white/10">
                        <p className="text-white/80 italic">"{agentReviewText}"</p>
                    </div>
                )}

                {/* Rating Breakdown */}
                {(rating.agentPunctualityRating || rating.agentBehaviorRating || rating.agentHandlingRating) && (
                    <div className="flex flex-wrap gap-3 mb-3">
                        {rating.agentPunctualityRating && (
                            <div className="bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/30">
                                <span className="text-xs text-purple-300 font-medium">Punctuality: </span>
                                <span className="text-sm font-bold text-purple-200">{rating.agentPunctualityRating}★</span>
                            </div>
                        )}
                        {rating.agentBehaviorRating && (
                            <div className="bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
                                <span className="text-xs text-blue-300 font-medium">Behavior: </span>
                                <span className="text-sm font-bold text-blue-200">{rating.agentBehaviorRating}★</span>
                            </div>
                        )}
                        {rating.agentHandlingRating && (
                            <div className="bg-green-500/20 px-3 py-1.5 rounded-lg border border-green-500/30">
                                <span className="text-xs text-green-300 font-medium">Handling: </span>
                                <span className="text-sm font-bold text-green-200">{rating.agentHandlingRating}★</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Parcel Info */}
                <div className="flex flex-wrap gap-4 text-xs text-white/50">
                    <span className="flex items-center gap-1">
                        <FaTruck className="text-white/40" />
                        {rating.trackingNumber}
                    </span>
                </div>
            </div>
        </div>
    );
}
