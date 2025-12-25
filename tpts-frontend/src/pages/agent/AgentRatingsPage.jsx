import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentAgent, getAgentRatings, getAgentRatingSummary } from "../../services/agentService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaStar, FaUser, FaQuoteLeft, FaThumbsUp, FaThumbsDown, FaCommentAlt } from "react-icons/fa";
import Pagination from "../../components/common/Pagination";

const ITEMS_PER_PAGE = 6;

export default function AgentRatingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [ratings, setRatings] = useState([]);
    const [summary, setSummary] = useState(null);
    const [agent, setAgent] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetchRatingsData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    const fetchRatingsData = async () => {
        setLoading(true);
        try {
            const agentData = await getCurrentAgent();
            setAgent(agentData);

            if (agentData?.id) {
                const [ratingsData, summaryData] = await Promise.all([
                    getAgentRatings(agentData.id),
                    getAgentRatingSummary(agentData.id)
                ]);
                setRatings(ratingsData || []);
                setSummary(summaryData);
            }
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

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`text-lg ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
                    />
                ))}
            </div>
        );
    };

    // Filter ratings
    const filteredRatings = ratings.filter(r => {
        if (filter === "all") return true;
        if (filter === "positive") return r.agentRating >= 4;
        if (filter === "negative") return r.agentRating < 4;
        if (filter === "withReview") return r.agentReview && r.agentReview.trim().length > 0;
        return true;
    });

    // Pagination
    const totalItems = filteredRatings.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedRatings = filteredRatings.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const avgRating = summary?.averageRating || agent?.ratingAvg || 0;
    const totalRatings = summary?.totalRatings || ratings.length;
    const positiveCount = ratings.filter(r => r.agentRating >= 4).length;
    const negativeCount = ratings.filter(r => r.agentRating < 4).length;
    const withReviewCount = ratings.filter(r => r.agentReview && r.agentReview.trim().length > 0).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-orange-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading ratings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">My Ratings</h1>
                <p className="text-sm text-gray-500 mt-1">See what customers say about your service</p>
            </div>

            {/* Rating Summary Card */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                    {/* Average Rating */}
                    <div className="text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-3 mb-2">
                            <span className="text-6xl font-bold">{avgRating.toFixed(1)}</span>
                            <div className="flex flex-col items-start">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <FaStar
                                            key={star}
                                            className={`text-2xl ${star <= Math.round(avgRating) ? "text-yellow-300" : "text-white/30"}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-white/80 text-sm mt-1">{totalRatings} reviews</p>
                            </div>
                        </div>
                        <p className="text-white/70 text-sm">Your overall customer rating</p>
                    </div>

                    {/* Rating Distribution */}
                    <div className="flex-1 w-full max-w-md">
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = summary?.ratingDistribution?.[star] ??
                                ratings.filter(r => r.agentRating && Math.floor(r.agentRating) === star).length;
                            const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3 mb-2">
                                    <span className="text-sm text-white/90 w-8 font-medium">{star}★</span>
                                    <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-yellow-300 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm text-white/80 w-10 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4 lg:gap-6">
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[80px]">
                            <FaThumbsUp className="text-2xl mx-auto mb-1 text-green-300" />
                            <p className="text-2xl font-bold">{positiveCount}</p>
                            <p className="text-xs text-white/70">Positive</p>
                        </div>
                        <div className="text-center bg-white/10 rounded-xl p-4 min-w-[80px]">
                            <FaThumbsDown className="text-2xl mx-auto mb-1 text-red-300" />
                            <p className="text-2xl font-bold">{negativeCount}</p>
                            <p className="text-xs text-white/70">Negative</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { key: "all", label: "All Reviews", count: ratings.length, icon: FaStar, color: "orange" },
                    { key: "positive", label: "Positive", count: positiveCount, icon: FaThumbsUp, color: "green" },
                    { key: "negative", label: "Negative", count: negativeCount, icon: FaThumbsDown, color: "red" },
                    { key: "withReview", label: "With Comments", count: withReviewCount, icon: FaCommentAlt, color: "blue" },
                ].map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${filter === f.key
                                ? "border-orange-500 bg-orange-50 shadow-md"
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${filter === f.key ? "bg-orange-500 text-white" : `bg-${f.color}-100 text-${f.color}-600`
                                }`}>
                                <f.icon />
                            </div>
                            <div>
                                <p className="text-xl font-bold text-gray-900">{f.count}</p>
                                <p className="text-xs text-gray-500">{f.label}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {filter === "all" ? "All Reviews" :
                            filter === "positive" ? "Positive Reviews" :
                                filter === "negative" ? "Negative Reviews" : "Reviews with Comments"}
                    </h3>
                </div>

                {filteredRatings.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                            <FaStar className="text-4xl text-gray-300" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reviews Found</h3>
                        <p className="text-sm text-gray-500">
                            {filter === "all" ? "Complete more deliveries to get reviews" : "No reviews match this filter"}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {paginatedRatings.map((rating) => (
                            <div
                                key={rating.id}
                                className={`p-5 hover:bg-gray-50 transition border-l-4 ${rating.agentRating >= 4 ? "border-l-green-500" : "border-l-red-500"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${rating.agentRating >= 4 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                            }`}>
                                            <FaUser className="text-lg" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="font-semibold text-gray-900">{rating.customerName || "Customer"}</p>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${rating.agentRating >= 4
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {rating.agentRating >= 4 ? "Satisfied" : "Needs Improvement"}
                                                </span>
                                            </div>
                                            {renderStars(rating.agentRating)}

                                            {rating.agentReview && (
                                                <div className="mt-3 flex items-start gap-2">
                                                    <FaQuoteLeft className="text-gray-300 mt-1 flex-shrink-0 text-sm" />
                                                    <p className="text-gray-600 text-sm leading-relaxed">{rating.agentReview}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className="text-xs text-gray-500">
                                            {new Date(rating.createdAt).toLocaleDateString("en-IN", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                />
            )}
        </div>
    );
}
