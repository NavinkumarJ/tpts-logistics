import { Link, useLocation, useNavigate } from "react-router-dom";

export default function PendingApprovalPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || "your email";

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Back Button - Added at top */}
        <div className="mb-4">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            <span>←</span> Back to Home
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
        </div>

        {/* Card */}
        <div className="card shadow-xl p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-4xl mb-6">
            ⏳
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Pending Admin Approval
          </h2>
          
          <p className="text-sm text-gray-600 mb-6">
            Your company registration has been successfully submitted and OTP verified!
            <br /><br />
            Your account is currently under review by our admin team. You'll receive an email
            at <strong>{email}</strong> once your company is approved.
          </p>

          <div className="rounded-md bg-amber-50 border border-amber-200 p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-amber-900 mb-2">📋 What's Next?</p>
            <ul className="text-xs text-amber-800 space-y-1.5">
              <li>• Our team will verify your company documents</li>
              <li>• This usually takes 24-48 hours</li>
              <li>• You'll get an email notification once approved</li>
              <li>• After approval, you can login and start managing deliveries</li>
            </ul>
          </div>

          <Link to="/" className="btn-primary w-full mb-3">
            Back to Home
          </Link>
          
          <Link to="/login" className="btn-outline w-full">
            Try Login Later
          </Link>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Need help?{" "}
            <Link to="/contact" className="text-primary-600 hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
