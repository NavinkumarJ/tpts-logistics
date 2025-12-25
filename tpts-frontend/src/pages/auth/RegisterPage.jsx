import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerRegister from "../../components/auth/CustomerRegister";
import CompanyRegister from "../../components/auth/CompanyRegister";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState(null);

  if (!accountType) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-indigo-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          {/* Back Button */}
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
            <h2 className="text-2xl font-bold text-gray-900">Create an Account</h2>
            <p className="mt-2 text-sm text-gray-600">
              Choose your account type to get started
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer */}
            <button
              onClick={() => setAccountType("customer")}
              className="card p-8 hover:shadow-xl transition text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50 text-primary-600 text-3xl group-hover:bg-primary-600 group-hover:text-white transition">
                  👤
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Customer Account
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Book shipments, track parcels, and manage deliveries
                  </p>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Book and track parcels
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Join group shipments
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Rate and review services
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Manage multiple addresses
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 text-primary-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Register as Customer →
              </div>
            </button>

            {/* Company */}
            <button
              onClick={() => setAccountType("company")}
              className="card p-8 hover:shadow-xl transition text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-3xl group-hover:bg-indigo-600 group-hover:text-white transition">
                  🏢
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Company Account
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Register your courier company and manage deliveries
                  </p>
                  <ul className="space-y-1.5 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Create group shipments
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Hire delivery agents
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Manage pricing & routes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Track earnings & analytics
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-6 text-indigo-600 font-medium flex items-center gap-2 group-hover:gap-3 transition-all">
                Register as Company →
              </div>
            </button>
          </div>

          {/* Login Link */}
          <div className="mt-8 text-center">
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

  return accountType === "customer" ? (
    <CustomerRegister onBack={() => setAccountType(null)} />
  ) : (
    <CompanyRegister onBack={() => setAccountType(null)} />
  );
}
