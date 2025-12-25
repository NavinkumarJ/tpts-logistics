import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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

      // Redirect based on user type
      setTimeout(() => {
        if (userType === "COMPANY_ADMIN") {
          // Company needs admin approval
          navigate("/pending-approval", { state: { email } });
        } else {
          // ✅ Customer goes to login page after OTP verification
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
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/register")}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>←</span> Back to Registration
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white font-bold text-xl shadow-lg">
              T
            </div>
            <span className="text-2xl font-bold text-gray-900">TPTS</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="mt-2 text-sm text-gray-600">
            We've sent a 6-digit OTP to
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-xl">
          <form onSubmit={handleVerify} className="p-6 sm:p-8 space-y-6">
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                required
                className="input text-center text-2xl font-semibold tracking-widest"
                placeholder="000000"
                autoFocus
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <p className="text-sm text-green-600 text-center">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600 text-center">⚠️ {error}</p>
              </div>
            )}

            {/* Verify Button */}
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
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
              <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
              {countdown > 0 ? (
                <p className="text-sm text-gray-500">
                  Resend available in <strong>{countdown}s</strong>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            The OTP is valid for 10 minutes. Please check your spam folder if you don't see it.
          </p>
        </div>
      </div>
    </main>
  );
}
