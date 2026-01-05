import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaClock, FaCheckCircle, FaEnvelope, FaBuilding, FaFileAlt } from "react-icons/fa";

export default function PendingApprovalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "your email";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/20 rounded-full blur-3xl" />
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
              className="h-20 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8 text-center">
          {/* Hourglass Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-4xl mb-6">
            <FaClock className="animate-pulse" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Pending Admin Approval
          </h2>

          <p className="text-sm text-white/70 mb-6">
            Your company registration has been successfully submitted and OTP verified!
            <br /><br />
            Your account is currently under review by our admin team. You'll receive an email
            at <strong className="text-white/90">{email}</strong> once your company is approved.
          </p>

          {/* What's Next Box */}
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
              <FaFileAlt /> What's Next?
            </p>
            <ul className="text-xs text-white/70 space-y-2">
              <li className="flex items-start gap-2">
                <FaCheckCircle className="text-green-400 mt-0.5 flex-shrink-0" />
                <span>Our team will verify your company documents</span>
              </li>
              <li className="flex items-start gap-2">
                <FaClock className="text-amber-400 mt-0.5 flex-shrink-0" />
                <span>This usually takes 24-48 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <FaEnvelope className="text-blue-400 mt-0.5 flex-shrink-0" />
                <span>You'll get an email notification once approved</span>
              </li>
              <li className="flex items-start gap-2">
                <FaBuilding className="text-purple-400 mt-0.5 flex-shrink-0" />
                <span>After approval, you can login and start managing deliveries</span>
              </li>
            </ul>
          </div>

          {/* Buttons */}
          <Link
            to="/"
            className="block w-full py-3 px-4 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/30 transition-all duration-200 mb-3"
          >
            Back to Home
          </Link>

          <Link
            to="/login"
            className="block w-full py-3 px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium rounded-xl transition-all duration-200"
          >
            Try Login Later
          </Link>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">
            Need help?{" "}
            <Link to="/contact" className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
