import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../../utils/api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim(); // ✅ ADD .trim() to remove whitespace

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    } else {
      // ✅ Log the token to verify it's correct
      console.log("Reset token from URL:", token);
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // ✅ Send the token exactly as received
      await apiClient.post("/auth/reset-password", {
        token: token,
        newPassword: formData.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Reset password error:", err.response?.data); // ✅ Log full error
      setError(
        err.response?.data?.message || "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl mb-4">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            <Link to="/login" className="btn-primary w-full">
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>←</span> Back to Login
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
          <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your new password below
          </p>
        </div>

        {/* Card */}
        <div className="card shadow-xl">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={6}
                className="input"
                placeholder="Enter new password"
                value={formData.newPassword}
                onChange={handleChange}
                disabled={!token}
              />
              <p className="mt-1 text-xs text-gray-500">Minimum 6 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                className="input"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={!token}
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-600">⚠️ {error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary w-full py-3 text-base disabled:opacity-50"
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>

            <Link
              to="/forgot-password"
              className="block text-center text-sm text-primary-600 hover:text-primary-700"
            >
              Request a new reset link
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}
