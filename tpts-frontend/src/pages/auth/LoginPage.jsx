import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../utils/api";
import { FaUser, FaBiking, FaBuilding, FaCog, FaEnvelope, FaLock, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaEye, FaEyeSlash } from "react-icons/fa";

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
  const [showPassword, setShowPassword] = useState(false);

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
    { value: "CUSTOMER", label: "Customer", icon: FaUser, desc: "Book and track parcels", color: "from-blue-500 to-blue-600" },
    { value: "DELIVERY_AGENT", label: "Delivery Agent", icon: FaBiking, desc: "Deliver packages", color: "from-green-500 to-green-600" },
    { value: "COMPANY_ADMIN", label: "Company Admin", icon: FaBuilding, desc: "Manage company", color: "from-purple-500 to-purple-600" },
    { value: "SUPER_ADMIN", label: "Super Admin", icon: FaCog, desc: "Platform admin", color: "from-orange-500 to-orange-600" },
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
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-white/70 hover:text-white flex items-center gap-2 transition-colors group"
          >
            <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
            <img
              src="/logo.png"
              alt="TPTS Logo"
              className="h-24 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
            />
          </Link>
          <h2 className="text-2xl font-bold text-white">Welcome back</h2>
          <p className="mt-2 text-sm text-white/60">
            Sign in to your account to continue
          </p>
        </div>

        {/* Success Message from OTP Verification */}
        {successMessage && (
          <div className="rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-400/30 p-4 mb-6 flex items-center gap-3">
            <FaCheckCircle className="text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-100">{successMessage}</p>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* User Type Selector */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-3">
                I am a <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {userTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = formData.userType === type.value;
                  return (
                    <label
                      key={type.value}
                      className={`relative flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                        ? "bg-white shadow-lg scale-[1.02]"
                        : "bg-white/5 hover:bg-white/10 border border-white/10"
                        }`}
                    >
                      <input
                        type="radio"
                        name="userType"
                        value={type.value}
                        checked={isSelected}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${isSelected
                        ? `bg-gradient-to-br ${type.color} text-white shadow-lg`
                        : "bg-white/10 text-white/60"
                        }`}>
                        <IconComponent className="text-lg" />
                      </div>
                      <span className={`text-xs font-semibold text-center ${isSelected ? "text-gray-900" : "text-white"}`}>
                        {type.label}
                      </span>
                      <span className={`text-[10px] text-center mt-0.5 ${isSelected ? "text-gray-500" : "text-white/50"}`}>
                        {type.desc}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md">
                          <FaCheckCircle className="text-[10px]" />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-primary-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-white/90">
                  Password <span className="text-red-400">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-primary-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-12 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-4 flex items-start gap-3">
                <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-100">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-primary-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <FaSpinner className="animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Register Link */}
            <div className="flex justify-center items-center gap-1 pt-2">
              <span className="text-sm text-white">
                Don't have an account?
              </span>
              <Link
                to="/register"
                className="text-sm text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
              >
                Register here
              </Link>
            </div>
          </form>
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-xs text-white/40">
            By signing in, you agree to our{" "}
            <Link to="/terms" className="text-primary-400 hover:text-primary-300 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-primary-400 hover:text-primary-300 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}