import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import apiClient from "../../utils/api";

export default function CustomerRatingPage() {
    const { parcelId } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [parcel, setParcel] = useState(null);
    const [canRate, setCanRate] = useState(false);
    const [existingRating, setExistingRating] = useState(null);

    const [ratings, setRatings] = useState({
        companyRating: 0,
        agentRating: 0,
        overallRating: 0,
        companyReview: "",
        agentReview: "",
        overallReview: "",
        wouldRecommend: true,
    });

    useEffect(() => {
        fetchParcelAndRatingStatus();
    }, [parcelId]);

    const fetchParcelAndRatingStatus = async () => {
        setLoading(true);
        try {
            // Check if can rate
            const canRateRes = await apiClient.get(`/ratings/can-rate/${parcelId}`);
            const canRateData = canRateRes.data.data;
            setCanRate(canRateData.canRate);
            setParcel(canRateData.parcel);

            if (canRateData.existingRating) {
                setExistingRating(canRateData.existingRating);
                // Pre-fill existing rating
                setRatings({
                    companyRating: canRateData.existingRating.companyRating || 0,
                    agentRating: canRateData.existingRating.agentRating || 0,
                    overallRating: canRateData.existingRating.overallRating || 0,
                    companyReview: canRateData.existingRating.companyReview || "",
                    agentReview: canRateData.existingRating.agentReview || "",
                    overallReview: canRateData.existingRating.overallReview || "",
                    wouldRecommend: canRateData.existingRating.wouldRecommend ?? true,
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to load parcel details");
            navigate("/customer/shipments");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (ratings.companyRating === 0) {
            toast.error("Please rate the company");
            return;
        }
        if (parcel?.agentName && ratings.agentRating === 0) {
            toast.error("Please rate the delivery agent");
            return;
        }
        if (ratings.overallRating === 0) {
            toast.error("Please provide overall rating");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                parcelId: parseInt(parcelId),
                companyRating: ratings.companyRating,
                agentRating: ratings.agentRating > 0 ? ratings.agentRating : null,
                overallRating: ratings.overallRating,
                companyReview: ratings.companyReview || null,
                agentReview: ratings.agentReview || null,
                overallReview: ratings.overallReview || null,
                wouldRecommend: ratings.wouldRecommend,
                isPublic: true,
            };

            if (existingRating) {
                await apiClient.put(`/ratings/${existingRating.id}`, payload);
                toast.success("Rating updated successfully!");
            } else {
                await apiClient.post("/ratings", payload);
                toast.success("Thank you for your feedback!");
            }
            navigate("/customer/shipments");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit rating");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!canRate && !existingRating) {
        return (
            <div className="bg-white rounded-xl p-8 shadow-md text-center">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot Rate This Delivery</h2>
                <p className="text-gray-600 mb-6">
                    This delivery cannot be rated. It may not be delivered yet or rating period has passed.
                </p>
                <button onClick={() => navigate("/customer/shipments")} className="btn-primary">
                    Back to Shipments
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Rate Your Delivery</h1>
                <p className="text-gray-600 mt-1">
                    Share your feedback for tracking #{parcel?.trackingNumber}
                </p>
            </div>

            {/* Parcel Info Card */}
            <div className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Route</p>
                        <p className="font-semibold text-gray-900">
                            {parcel?.pickupCity} → {parcel?.deliveryCity}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Company</p>
                        <p className="font-semibold text-gray-900">{parcel?.companyName}</p>
                    </div>
                </div>
            </div>

            {/* Rating Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Company Rating */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Rate the Company</h3>
                    <StarRating
                        value={ratings.companyRating}
                        onChange={(val) => setRatings({ ...ratings, companyRating: val })}
                    />
                    <textarea
                        className="input mt-4 w-full"
                        rows={3}
                        placeholder="Share your experience with the company (optional)"
                        value={ratings.companyReview}
                        onChange={(e) => setRatings({ ...ratings, companyReview: e.target.value })}
                    />
                </div>

                {/* Agent Rating (if agent assigned) */}
                {parcel?.agentName && (
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            🚚 Rate the Delivery Agent
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">{parcel.agentName}</p>
                        <StarRating
                            value={ratings.agentRating}
                            onChange={(val) => setRatings({ ...ratings, agentRating: val })}
                        />
                        <textarea
                            className="input mt-4 w-full"
                            rows={3}
                            placeholder="How was the delivery agent? (optional)"
                            value={ratings.agentReview}
                            onChange={(e) => setRatings({ ...ratings, agentReview: e.target.value })}
                        />
                    </div>
                )}

                {/* Overall Rating */}
                <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⭐ Overall Experience</h3>
                    <StarRating
                        value={ratings.overallRating}
                        onChange={(val) => setRatings({ ...ratings, overallRating: val })}
                    />
                    <textarea
                        className="input mt-4 w-full"
                        rows={3}
                        placeholder="Tell us about your overall experience (optional)"
                        value={ratings.overallReview}
                        onChange={(e) => setRatings({ ...ratings, overallReview: e.target.value })}
                    />

                    {/* Would Recommend */}
                    <div className="mt-4 flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={ratings.wouldRecommend}
                                onChange={(e) => setRatings({ ...ratings, wouldRecommend: e.target.checked })}
                                className="w-5 h-5 text-primary-600 rounded"
                            />
                            <span className="text-gray-700">I would recommend this service</span>
                        </label>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4">
                    <button
                        type="button"
                        onClick={() => navigate("/customer/shipments")}
                        className="btn-outline flex-1"
                    >
                        Cancel
                    </button>
                    <button type="submit" disabled={submitting} className="btn-primary flex-1">
                        {submitting ? "Submitting..." : existingRating ? "Update Rating" : "Submit Rating"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Star Rating Component
function StarRating({ value, onChange, max = 5 }) {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex gap-1">
            {[...Array(max)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        key={index}
                        type="button"
                        className={`text-3xl transition-transform hover:scale-110 ${starValue <= (hover || value) ? "text-yellow-400" : "text-gray-300"
                            }`}
                        onClick={() => onChange(starValue)}
                        onMouseEnter={() => setHover(starValue)}
                        onMouseLeave={() => setHover(0)}
                    >
                        ★
                    </button>
                );
            })}
            <span className="ml-2 text-sm text-gray-500 self-center">
                {value > 0 ? `${value}/5` : "Select rating"}
            </span>
        </div>
    );
}
