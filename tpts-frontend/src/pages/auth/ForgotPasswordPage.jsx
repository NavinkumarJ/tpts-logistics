import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import apiClient from "../../utils/api";
import { FaEnvelope, FaArrowLeft, FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await apiClient.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Success Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 border border-green-400/30 text-green-400 text-3xl mb-6">
              <FaCheckCircle />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Check Your Email
            </h2>
            <p className="text-sm text-white/60 mb-8">
              We've sent a password reset link to <strong className="text-white">{email}</strong>.
              Please check your inbox and follow the instructions.
            </p>
            <Link
              to="/login"
              className="block w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
            onClick={() => navigate("/login")}
            className="text-sm text-white/70 hover:text-white flex items-center gap-2 transition-colors group"
          >
            <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
            <span>Back to Login</span>
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
          <h2 className="text-2xl font-bold text-white">Forgot Password?</h2>
          <p className="mt-2 text-sm text-white/60">
            No worries! Enter your email and we'll send you reset instructions.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Email Input */}
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
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                  Sending...
                </span>
              ) : (
                "Send Reset Link"
              )}
            </button>

            {/* Back to Login */}
            <Link
              to="/login"
              className="block w-full text-center py-3.5 px-4 rounded-xl border-2 border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
            >
              ← Back to Login
            </Link>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">
            Remember your password?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
