import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaBuilding, FaArrowLeft, FaCheck, FaBox, FaUsers, FaChartLine, FaMapMarkerAlt, FaStar, FaRoute, FaMoneyBillWave, FaTruck } from "react-icons/fa";
import CustomerRegister from "../../components/auth/CustomerRegister";
import CompanyRegister from "../../components/auth/CompanyRegister";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState(null);

  if (!accountType) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 flex items-center justify-center py-12 px-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-600/10 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-4xl relative z-10">
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

          {/* Header */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
              <img
                src="/logo.png"
                alt="TPTS Logo"
                className="h-24 w-auto object-contain transition-all duration-200 group-hover:brightness-125 group-hover:scale-105"
              />
            </Link>
            <h2 className="text-3xl font-bold text-white mb-2">Create an Account</h2>
            <p className="text-white/60">
              Choose your account type to get started
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Customer */}
            <button
              onClick={() => setAccountType("customer")}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                  <FaUser />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Customer Account
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Book shipments, track parcels, and manage deliveries
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-sm text-white/80 mt-6 pl-1">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaBox className="text-blue-400 text-xs" /> Book and track parcels
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaUsers className="text-blue-400 text-xs" /> Join group shipments
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaStar className="text-blue-400 text-xs" /> Rate and review services
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaMapMarkerAlt className="text-blue-400 text-xs" /> Manage multiple addresses
                  </span>
                </li>
              </ul>

              <div className="mt-8 py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 group-hover:from-blue-500 group-hover:to-blue-400 shadow-lg shadow-blue-500/30 transition-all">
                Register as Customer
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            {/* Company */}
            <button
              onClick={() => setAccountType("company")}
              className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 hover:bg-white/15 hover:border-white/30 hover:scale-[1.02] transition-all duration-300 text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white text-2xl shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
                  <FaBuilding />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Company Account
                  </h3>
                  <p className="text-sm text-white/60 mb-4">
                    Register your courier company and manage deliveries
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 text-sm text-white/80 mt-6 pl-1">
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaRoute className="text-purple-400 text-xs" /> Create group shipments
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaTruck className="text-purple-400 text-xs" /> Hire delivery agents
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaMoneyBillWave className="text-purple-400 text-xs" /> Manage pricing & routes
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <FaCheck className="text-green-400 text-[10px]" />
                  </div>
                  <span className="flex items-center gap-2">
                    <FaChartLine className="text-purple-400 text-xs" /> Track earnings & analytics
                  </span>
                </li>
              </ul>

              <div className="mt-8 py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-500 rounded-xl text-white font-semibold flex items-center justify-center gap-2 group-hover:from-purple-500 group-hover:to-purple-400 shadow-lg shadow-purple-500/30 transition-all">
                Register as Company
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          </div>

          {/* Login Link */}
          <div className="mt-10 text-center">
            <p className="text-lg text-white/80">
              Already have an account?{" "}
              <Link to="/login" className="font-bold text-cyan-400 hover:text-cyan-300 text-xl hover:underline transition-colors">
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
