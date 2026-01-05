import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaTruck, FaUsers, FaMoneyBillWave, FaMapMarkerAlt, FaBriefcase, FaChartLine, FaBox, FaRoute, FaShieldAlt, FaBuilding, FaCreditCard, FaStar, FaCheck } from 'react-icons/fa';
import apiClient from "../../utils/api";

export default function LandingPage() {
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalDeliveries: 0,
    totalCustomers: 0,
    citiesCovered: 0,
  });
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get("/public/stats");
        if (response.data?.data) {
          setStats(response.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };
    fetchStats();
  }, []);

  // Auto-cycle tabs every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + "K+";
    }
    return num > 0 ? num + "+" : "0";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            {/* Left content */}
            <div>
              <p className="mb-4 inline-flex items-center rounded-full bg-primary-500/20 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white border border-primary-400/50">
                💰 Save up to 40% with group shipments
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-white">
                Ship Smarter, <br />
                <span className="text-primary-400">Save More</span>
              </h1>
              <p className="mt-6 text-lg text-white/70 max-w-xl">
                Join verified courier companies, group your shipments, and cut
                delivery costs while enjoying real-time tracking and secure
                payments.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200"
                >
                  Get Started →
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 px-8 py-3.5 font-semibold text-white hover:bg-white/10 transition-all"
                >
                  Track Shipment
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.totalCompanies)}</p>
                  <p className="text-sm text-white/60">Courier Companies</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.totalDeliveries)}</p>
                  <p className="text-sm text-white/60">Deliveries</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <p className="text-2xl font-bold text-white">{formatNumber(stats.citiesCovered)}</p>
                  <p className="text-sm text-white/60">Cities Covered</p>
                </div>
              </div>
            </div>

            {/* Right: Animated Feature Showcase */}
            <div className="relative max-w-md mx-auto lg:ml-auto w-full">
              {/* Animated background effects */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-primary-500/30 via-indigo-500/20 to-purple-500/30 blur-[80px] rounded-full animate-spin-slow"></div>

              {/* Floating particles */}
              <div className="absolute top-4 right-8 w-2 h-2 bg-primary-400 rounded-full animate-float-1"></div>
              <div className="absolute bottom-12 left-4 w-1.5 h-1.5 bg-purple-400 rounded-full animate-float-2"></div>
              <div className="absolute top-1/3 right-4 w-1 h-1 bg-green-400 rounded-full animate-float-3"></div>

              {/* Showcase Card - Dark glassmorphic */}
              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
                {/* Animated top border */}
                <div className="h-1.5 bg-gradient-to-r from-primary-500 via-purple-500 to-pink-500 animate-gradient-x"></div>

                {/* Tab Navigation */}
                <div className="flex bg-white/5 border-b border-white/10">
                  {[
                    { label: 'Live Demo', icon: '🎯' },
                    { label: 'Smart Savings', icon: '💎' },
                    { label: 'Why Us', icon: '🏆' },
                  ].map((tab, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`flex-1 py-3.5 text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2 relative
                        ${activeTab === idx
                          ? 'text-white bg-white/10'
                          : 'text-white/50 hover:text-white/70'}`}
                    >
                      <span className={`text-base transition-transform duration-300 ${activeTab === idx ? 'scale-125' : ''}`}>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {activeTab === idx && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full"></div>}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-5 min-h-[260px] relative overflow-hidden">

                  {/* Tab 0: Live Tracking Demo */}
                  <div className={`transition-all duration-500 ${activeTab === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 p-5 -translate-y-4 pointer-events-none'}`}>
                    {/* Animated tracking visualization */}
                    <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-500/30 flex items-center justify-center animate-pulse-glow">
                            <span className="text-lg">📦</span>
                          </div>
                          <div>
                            <p className="text-xs text-white font-medium">Your Package</p>
                            <p className="text-[10px] text-white/60">TRK-847291</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping"></span>
                          <span className="text-[10px] text-green-400 font-medium">In Transit</span>
                        </div>
                      </div>

                      {/* Animated route */}
                      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 rounded-full animate-progress" style={{ width: '70%' }}></div>
                        <div className="absolute top-1/2 -translate-y-1/2 animate-truck-move" style={{ left: '65%' }}>
                          <div className="w-6 h-6 -mt-1.5 bg-white rounded-lg shadow-lg flex items-center justify-center text-sm">
                            🚚
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between mt-2 text-[10px] text-white/60">
                        <span>Mumbai</span>
                        <span className="text-primary-400 font-medium">70% Complete</span>
                        <span>Delhi</span>
                      </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: '🛰️', label: 'Real-time GPS' },
                        { icon: '🔐', label: 'OTP Secure' },
                        { icon: '📸', label: 'Photo Proof' },
                      ].map((f, idx) => (
                        <div
                          key={idx}
                          className="bg-white/10 rounded-xl p-3 text-center border border-white/20 hover:bg-white/15 hover:border-primary-400/50 transition-all cursor-pointer group"
                        >
                          <span className="text-xl group-hover:scale-110 inline-block transition-transform">{f.icon}</span>
                          <p className="text-[10px] text-white/60 mt-1">{f.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tab 1: Smart Savings */}
                  <div className={`transition-all duration-500 ${activeTab === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 p-5 translate-y-4 pointer-events-none'}`}>
                    {/* Animated savings counter */}
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 mb-3">
                        <span className="text-xl animate-bounce-slow">💰</span>
                        <span className="text-xl font-bold text-green-400 animate-count">₹80</span>
                        <span className="text-xs text-green-400/80">saved per order</span>
                      </div>
                    </div>

                    {/* Visual comparison with animation */}
                    <div className="relative">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10 relative">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white/30 text-white/70 text-[8px] px-2 py-0.5 rounded-full">SOLO</div>
                          <div className="text-3xl mb-2 opacity-50">📦</div>
                          <p className="text-white/40 text-sm line-through">₹200</p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-4 text-center border-2 border-green-500/40 relative animate-glow-green">
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold shadow-lg shadow-green-500/50">GROUP</div>
                          <div className="text-3xl mb-2 flex justify-center gap-0">
                            <span className="animate-box-1">📦</span>
                            <span className="animate-box-2">📦</span>
                            <span className="animate-box-3">📦</span>
                          </div>
                          <p className="text-green-400 text-lg font-bold">₹120</p>
                        </div>
                      </div>

                      {/* Connecting arrow */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-white/40 animate-pulse">→</div>
                    </div>

                    <p className="text-center text-xs text-white/50 mt-4 flex items-center justify-center gap-1">
                      <span className="animate-spin-slow">🔄</span> Same route, shared vehicle, lower cost
                    </p>
                  </div>

                  {/* Tab 2: Platform Experience */}
                  <div className={`transition-all duration-500 ${activeTab === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 absolute inset-0 p-5 translate-y-4 pointer-events-none'}`}>
                    {/* User journey highlights */}
                    <div className="space-y-2.5">
                      {[
                        { icon: '🎯', title: 'Choose Your Way', desc: 'Regular order or Group Buy savings', delay: 0 },
                        { icon: '💳', title: 'Pay Securely', desc: 'UPI, Cards, Net Banking via Razorpay', delay: 0.1 },
                        { icon: '📱', title: 'Track Live', desc: 'GPS tracking, OTP, photo proof', delay: 0.2 },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/10 hover:bg-white/10 hover:border-primary-400/30 transition-all cursor-pointer group"
                          style={{ animation: activeTab === 2 ? `slideIn 0.4s ease-out ${item.delay}s both` : 'none' }}
                        >
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-base group-hover:scale-110 transition-transform shadow-sm">
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-[10px] text-white/50">{item.desc}</p>
                          </div>
                          <span className="text-white/40 group-hover:text-primary-400 transition-colors">→</span>
                        </div>
                      ))}
                    </div>

                    {/* Trust badges */}
                    <div className="flex justify-center gap-2 mt-4">
                      {['🔒 Secure', '⚡ Fast', '⭐ Rated'].map((badge, idx) => (
                        <span key={idx} className="text-[10px] text-white/60 px-2 py-1 bg-white/10 rounded-full border border-white/10">
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-2 pb-4 bg-transparent">
                  {[0, 1, 2].map(idx => (
                    <button
                      key={idx}
                      onClick={() => setActiveTab(idx)}
                      className={`rounded-full transition-all duration-300 ${activeTab === idx
                        ? 'w-8 h-2 bg-gradient-to-r from-primary-500 to-purple-500'
                        : 'w-2 h-2 bg-white/30 hover:bg-white/50'
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Enhanced CSS animations */}
              <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                
                @keyframes float-1 { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-15px) translateX(5px); } }
                @keyframes float-2 { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-10px) translateX(-5px); } }
                @keyframes float-3 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                .animate-float-1 { animation: float-1 4s ease-in-out infinite; }
                .animate-float-2 { animation: float-2 5s ease-in-out infinite 0.5s; }
                .animate-float-3 { animation: float-3 3s ease-in-out infinite 1s; }
                
                @keyframes gradient-x { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
                .animate-gradient-x { background-size: 200% 200%; animation: gradient-x 3s ease infinite; }
                
                @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); } 50% { box-shadow: 0 0 15px 2px rgba(56, 189, 248, 0.3); } }
                .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
                
                @keyframes progress { 0% { width: 0%; } 100% { width: 70%; } }
                .animate-progress { animation: progress 2s ease-out; }
                
                @keyframes truck-move { 0%, 100% { transform: translateY(-50%) translateX(0); } 50% { transform: translateY(-50%) translateX(5px); } }
                .animate-truck-move { animation: truck-move 1s ease-in-out infinite; }
                
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
                
                @keyframes count { 0% { opacity: 0; transform: scale(0.5); } 50% { transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
                .animate-count { animation: count 0.6s ease-out; }
                
                @keyframes glow-green { 0%, 100% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.2); } 50% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.4); } }
                .animate-glow-green { animation: glow-green 2s ease-in-out infinite; }
                
                @keyframes box-1 { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-3px); } }
                @keyframes box-2 { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
                @keyframes box-3 { 0%, 100% { transform: translateY(0); } 75% { transform: translateY(-3px); } }
                .animate-box-1 { animation: box-1 1.5s ease-in-out infinite; }
                .animate-box-2 { animation: box-2 1.5s ease-in-out infinite; }
                .animate-box-3 { animation: box-3 1.5s ease-in-out infinite; }
                
                @keyframes slideIn { 0% { opacity: 0; transform: translateX(-20px); } 100% { opacity: 1; transform: translateX(0); } }
                @keyframes popIn { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
              `}</style>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TPTS */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Why choose <span className="text-primary-400">TPTS</span>?
            </h2>
            <p className="mt-3 text-base text-white/60">
              Built for customers, courier companies, and delivery agents.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FaBox,
                title: "Group Buy Savings",
                desc: "Join group shipments and save up to 40% on delivery costs.",
                gradient: "from-primary-500 to-primary-600",
              },
              {
                icon: FaMapMarkerAlt,
                title: "Live Tracking",
                desc: "Real-time updates, OTP verification, and proof-of-delivery photos.",
                gradient: "from-indigo-500 to-indigo-600",
              },
              {
                icon: FaRoute,
                title: "Optimized Routes",
                desc: "Smart routing for faster deliveries and efficient logistics.",
                gradient: "from-emerald-500 to-emerald-600",
              },
              {
                icon: FaBuilding,
                title: "Multiple Companies",
                desc: `Choose from ${stats.totalCompanies || "multiple"} verified courier companies with transparent pricing.`,
                gradient: "from-purple-500 to-purple-600",
              },
              {
                icon: FaCreditCard,
                title: "Secure Payments",
                desc: "Razorpay integration with UPI, cards, and wallet support.",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                icon: FaStar,
                title: "Ratings & Reviews",
                desc: "Rate agents and companies. Choose based on real customer feedback.",
                gradient: "from-orange-500 to-orange-600",
              },
            ].map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 hover:scale-[1.02] transition-all duration-300 group">
                  <div className={`mb-4 w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="text-2xl text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm text-white/60">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-3">
            How it works
          </h2>
          <p className="text-center text-white/60 mb-12">Simple, fast, and transparent</p>

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: 1, title: "Book", desc: "Create a parcel order, choose company & group option.", icon: "📝" },
              { num: 2, title: "Pay", desc: "Secure payment via Razorpay with instant confirmation.", icon: "💳" },
              { num: 3, title: "Track", desc: "Follow every step with live GPS tracking.", icon: "📍" },
              { num: 4, title: "Receive", desc: "Delivered with OTP verification and photo proof.", icon: "✅" },
            ].map((step) => (
              <li key={step.num} className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 text-center hover:bg-white/15 transition-all group">
                <div className="flex justify-center mb-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-xl font-bold shadow-lg shadow-primary-500/30 group-hover:scale-110 transition-transform">
                    {step.num}
                  </span>
                </div>
                <div className="text-3xl mb-3">{step.icon}</div>
                <p className="text-lg font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-sm text-white/60">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits for Different Users */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white mb-12">
            Who benefits from TPTS?
          </h2>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* For Customers */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-xl rounded-2xl p-8 border border-blue-400/30 hover:border-blue-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <FaUsers className="text-2xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">For Customers</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { text: "Save up to 40%", sub: "with group buy shipments" },
                  { text: "Multiple companies", sub: "to choose from with transparent rates" },
                  { text: "Real-time GPS tracking", sub: "of your parcels" },
                  { text: "Secure payments", sub: "via Razorpay (UPI, Cards, Net Banking)" },
                  { text: "OTP verification", sub: "and photo proof of delivery" },
                  { text: "Rate and review", sub: "agents and companies" },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-blue-400 text-xs" />
                    </span>
                    <span className="text-white/80"><strong className="text-white">{item.text}</strong> {item.sub}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-6 block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
                Start Shipping
              </Link>
            </div>

            {/* For Company Admins */}
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-xl rounded-2xl p-8 border border-purple-400/30 hover:border-purple-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <FaBriefcase className="text-2xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">For Companies</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { text: "Reach more customers", sub: "across multiple cities" },
                  { text: "Manage agents", sub: "and track all deliveries in one dashboard" },
                  { text: "Track earnings", sub: "and view detailed analytics" },
                  { text: "Create group shipments", sub: "to maximize vehicle capacity" },
                  { text: "Real-time analytics", sub: "on earnings and performance" },
                  { text: "Post job listings", sub: "to hire delivery agents" },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-purple-400 text-xs" />
                    </span>
                    <span className="text-white/80"><strong className="text-white">{item.text}</strong> {item.sub}</span>
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-6 block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
                Register Company
              </Link>
            </div>

            {/* For Delivery Agents */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-xl rounded-2xl p-8 border border-green-400/30 hover:border-green-400/50 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/30">
                  <FaTruck className="text-2xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">For Agents</h3>
              </div>
              <ul className="space-y-3">
                {[
                  { text: "Earn competitive wages", sub: "with flexible hours" },
                  { text: "Optimized routes", sub: "to complete more deliveries" },
                  { text: "Track your earnings", sub: "for each completed delivery" },
                  { text: "GPS-enabled navigation", sub: "for easy routing" },
                  { text: "Performance ratings", sub: "and reputation system" },
                  { text: "Work with verified companies", sub: "across multiple cities" },
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-green-400 text-xs" />
                    </span>
                    <span className="text-white/80"><strong className="text-white">{item.text}</strong> {item.sub}</span>
                  </li>
                ))}
              </ul>
              <Link to="/jobs" className="mt-6 block w-full text-center py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all">
                View Job Openings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats & Trust Section */}
      <section className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-primary-600/90 to-indigo-600/90 backdrop-blur-xl rounded-3xl p-12 border border-white/20">
            <h2 className="text-center text-3xl font-bold text-white mb-12">Trusted by customers across India</h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div>
                <FaTruck className="text-5xl mx-auto mb-3 text-white/90" />
                <p className="text-4xl font-bold text-white">{formatNumber(stats.totalDeliveries)}</p>
                <p className="text-primary-100 mt-2">Successful Deliveries</p>
              </div>
              <div>
                <FaUsers className="text-5xl mx-auto mb-3 text-white/90" />
                <p className="text-4xl font-bold text-white">{formatNumber(stats.totalCustomers)}</p>
                <p className="text-primary-100 mt-2">Happy Customers</p>
              </div>
              <div>
                <FaBriefcase className="text-5xl mx-auto mb-3 text-white/90" />
                <p className="text-4xl font-bold text-white">{formatNumber(stats.totalCompanies)}</p>
                <p className="text-primary-100 mt-2">Partner Companies</p>
              </div>
              <div>
                <FaMapMarkerAlt className="text-5xl mx-auto mb-3 text-white/90" />
                <p className="text-4xl font-bold text-white">{formatNumber(stats.citiesCovered)}</p>
                <p className="text-primary-100 mt-2">Cities Covered</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-400 mb-2">
              Ready to ship?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Create your free TPTS account today
            </h2>
            <p className="text-lg text-white/60 mb-8 max-w-2xl mx-auto">
              Join satisfied customers saving money on every shipment
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all"
              >
                Create Account →
              </Link>
              <Link
                to="/jobs"
                className="border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all"
              >
                Become a Delivery Agent
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
