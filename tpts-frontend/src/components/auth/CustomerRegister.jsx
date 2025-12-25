import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../utils/api";

export default function CustomerRegister({ onBack }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Exact fields from CustomerRegisterRequest DTO
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    pincode: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

// Change the success redirect:
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    const response = await apiClient.post("/auth/register/customer", formData);
    // ✅ Redirect to OTP verification instead of login
    navigate("/verify-otp", { 
      state: { 
        email: formData.email,
        userType: "CUSTOMER" 
      } 
    });
  } catch (err) {
    setError(err.response?.data?.message || "Registration failed. Please try again.");
  } finally {
    setLoading(false);
  }
};


  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg">
              T
            </div>
            <span className="text-2xl font-bold text-gray-900">TPTS</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Customer Registration</h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your customer account in seconds
          </p>
        </div>

        {/* Form Card */}
        <div className="card shadow-xl">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                required
                minLength={2}
                maxLength={100}
                className="input"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                className="input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                pattern="[6-9][0-9]{9}"
                className="input"
                placeholder="10-digit mobile number"
                value={formData.phone}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must start with 6-9 and be 10 digits long
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                maxLength={50}
                className="input"
                placeholder="Minimum 6 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                required
                maxLength={100}
                className="input"
                placeholder="e.g., Chennai"
                value={formData.city}
                onChange={handleChange}
              />
            </div>

            {/* Pincode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Pincode <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                required
                pattern="[1-9][0-9]{5}"
                className="input"
                placeholder="6-digit pincode"
                value={formData.pincode}
                onChange={handleChange}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            {/* Back Button */}
            <button
              type="button"
              onClick={onBack}
              className="btn-outline w-full py-3 text-base"
            >
              ← Back to Account Type
            </button>
          </form>
        </div>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
