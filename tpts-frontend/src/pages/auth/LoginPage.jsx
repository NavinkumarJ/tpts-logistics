import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../utils/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;
  const prefilledEmail = location.state?.email;

  const [formData, setFormData] = useState({
    email: prefilledEmail || "",
    password: "",
    userType: "CUSTOMER",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        window.history.replaceState({}, document.title);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const userTypes = [
    { value: "CUSTOMER", label: "Customer", icon: "👤", desc: "Book and track parcels" },
    { value: "DELIVERY_AGENT", label: "Delivery Agent", icon: "🚴", desc: "Deliver packages" },
    { value: "COMPANY_ADMIN", label: "Company Admin", icon: "🏢", desc: "Manage company" },
    { value: "SUPER_ADMIN", label: "Super Admin", icon: "⚙️", desc: "Platform admin" },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.post("/auth/login", formData);
      const { accessToken, refreshToken, user } = response.data.data;

      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      switch (user.userType) {
        case "CUSTOMER":
          navigate("/customer/dashboard");
          break;
        case "DELIVERY_AGENT":
          navigate("/agent/dashboard");
          break;
        case "COMPANY_ADMIN":
          navigate("/company/dashboard");
          break;
        case "SUPER_ADMIN":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message;
      
      if (errorMsg?.includes("pending approval")) {
        setError("Your company is pending admin approval. Please wait for verification email.");
      } else if (errorMsg?.includes("verify")) {
        setError("Please verify your email first. Check your inbox for OTP.");
      } else {
        setError(errorMsg || "Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>←</span> Back to Home
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg">
              T
            </div>
            <span className="text-2xl font-bold text-gray-900">TPTS</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account to continue
          </p>
        </div>

        {/* Success Message from OTP Verification */}
        {successMessage && (
          <div className="rounded-md bg-green-50 border border-green-200 p-3 mb-6">
            <p className="text-sm text-green-600 text-center">✓ {successMessage}</p>
          </div>
        )}

        {/* Login Card */}
        <div className="card shadow-xl">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* User Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                I am a <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {userTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`relative flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                      formData.userType === type.value
                        ? "border-primary-600 bg-primary-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="userType"
                      value={type.value}
                      checked={formData.userType === type.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-2xl mb-1">{type.icon}</span>
                    <span className="text-xs font-semibold text-gray-900 text-center">
                      {type.label}
                    </span>
                    <span className="text-[10px] text-gray-500 text-center mt-0.5">
                      {type.desc}
                    </span>
                    {formData.userType === type.value && (
                      <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs">
                        ✓
                      </div>
                    )}
                  </label>
                ))}
              </div>
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
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600 flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-500">
                  Don't have an account?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link
              to="/register"
              className="btn-outline w-full py-3 text-base text-center"
            >
              Create New Account
            </Link>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 card p-4 bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-900 mb-2">
            🔐 Demo Credentials (for testing):
          </p>
          <div className="space-y-1 text-xs text-amber-800">
            <p>
              <strong>Customer:</strong> customer@demo.com / password123
            </p>
            <p>
              <strong>Agent:</strong> agent@demo.com / password123
            </p>
            <p>
              <strong>Company:</strong> company@demo.com / password123
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}