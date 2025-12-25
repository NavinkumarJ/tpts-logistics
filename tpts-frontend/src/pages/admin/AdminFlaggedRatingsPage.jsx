import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFlaggedRatings, unflagRating, removeRating } from "../../services/adminService";
import { logout } from "../../utils/auth";
import toast from "react-hot-toast";
import { FaFlag, FaStar, FaCheck, FaTrash, FaUser, FaBuilding, FaTruck } from "react-icons/fa";

export default function AdminFlaggedRatingsPage() {
    const navigate = useNavigate();
    const [ratings, setRatings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRatings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRatings = async () => {
        setLoading(true);
        try {
            const data = await getFlaggedRatings();
            setRatings(data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate("/login");
            } else {
                toast.error("Failed to load flagged ratings");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUnflag = async (id) => {
        try {
            await unflagRating(id);
            toast.success("Rating unflagged");
            fetchRatings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to unflag rating");
        }
    };

    const handleRemove = async (id) => {
        if (!confirm("Are you sure you want to remove this rating from public view?")) return;
        try {
            await removeRating(id);
            toast.success("Rating removed from public view");
            fetchRatings();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to remove rating");
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                        key={star}
                        className={`text-sm ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-600 border-t-transparent"></div>
                <p className="mt-3 text-sm text-gray-600">Loading flagged ratings...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
                <p className="text-sm text-gray-500 mt-1">
                    {ratings.length} flagged {ratings.length === 1 ? "rating" : "ratings"} to review
                </p>
            </div>

            {/* Ratings List */}
            {ratings.length === 0 ? (
                <div className="bg-white rounded-xl p-12 shadow-md border border-gray-200 text-center">
                    <FaFlag className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Flagged Ratings</h3>
                    <p className="text-sm text-gray-500">
                        All clear! No ratings have been flagged for review.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {ratings.map((rating) => (
                        <div
                            key={rating.id}
                            className="bg-white rounded-xl p-6 shadow-md border border-red-200 hover:shadow-lg transition"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                                        <FaFlag />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">Rating #{rating.id}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            {renderStars(rating.companyRating || rating.agentRating)}
                                            <span className="text-sm text-gray-500">
                                                ({rating.companyRating || rating.agentRating}/5)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium">
                                    Flagged
                                </span>
                            </div>

                            {/* Review Text */}
                            {rating.reviewText && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <p className="text-gray-700 italic">"{rating.reviewText}"</p>
                                </div>
                            )}

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaUser className="text-gray-400" />
                                    <span>Customer: {rating.customerName || "Anonymous"}</span>
                                </div>
                                {rating.companyName && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FaBuilding className="text-gray-400" />
                                        <span>Company: {rating.companyName}</span>
                                    </div>
                                )}
                                {rating.agentName && (
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FaTruck className="text-gray-400" />
                                        <span>Agent: {rating.agentName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Flag Reason */}
                            {rating.flagReason && (
                                <div className="bg-amber-50 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-amber-700">
                                        <strong>Flag reason:</strong> {rating.flagReason}
                                    </p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handleUnflag(rating.id)}
                                    className="btn-outline flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50"
                                >
                                    <FaCheck /> Unflag (Keep)
                                </button>
                                <button
                                    onClick={() => handleRemove(rating.id)}
                                    className="btn-outline flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                                >
                                    <FaTrash /> Remove from Public
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
