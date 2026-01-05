import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import apiClient from "../../utils/api";

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const userType = location.state?.userType;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.post("/auth/verify-otp", {
        email,
        otp,
      });

      setSuccess("✓ OTP verified successfully!");

      setTimeout(() => {
        if (userType === "COMPANY_ADMIN") {
          navigate("/pending-approval", { state: { email } });
        } else {
          navigate("/login", {
            state: {
              message: "Email verified successfully! Please login to continue.",
              email
            }
          });
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setSuccess("");

    try {
      await apiClient.post("/auth/resend-otp", { email });
      setSuccess("✓ New OTP sent to your email!");
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
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
            onClick={() => navigate("/register")}
            className="text-sm text-white/70 hover:text-white flex items-center gap-2 transition-colors group"
          >
            <FaArrowLeft className="text-xs group-hover:-translate-x-1 transition-transform" />
            <span>Back to Registration</span>
          </button>
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
            <img
              src="/logo.png"
              alt="TPTS Logo"
              className="h-20 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
            />
          </Link>
          <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
          <p className="mt-2 text-sm text-white/60">
            We've sent a 6-digit OTP to
            <br />
            <strong className="text-white/80">{email}</strong>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
          <form onSubmit={handleVerify} className="p-6 sm:p-8 space-y-6">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-3 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-2xl font-semibold tracking-widest placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
                placeholder="000000"
                autoFocus
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="rounded-xl bg-green-500/20 border border-green-500/30 p-3">
                <p className="text-sm text-green-300 text-center">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-red-500/20 border border-red-500/30 p-3">
                <p className="text-sm text-red-300 text-center">⚠️ {error}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Verifying...
                </span>
              ) : (
                "Verify OTP"
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-sm text-white/60 mb-2">Didn't receive the code?</p>
              {countdown > 0 ? (
                <p className="text-sm text-white/50">
                  Resend available in <strong className="text-white/80">{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-medium text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">
            The OTP is valid for 10 minutes. Please check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    </main>
  );
}
