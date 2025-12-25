import { Link } from "react-router-dom";
import { FaTruck, FaUsers, FaMoneyBillWave, FaMapMarkerAlt, FaShieldAlt, FaLeaf, FaBriefcase, FaChartLine, FaClock } from 'react-icons/fa';

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            {/* Left content */}
            <div>
              <p className="mb-3 inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-sky-300 border border-sky-400/20">
                💰 Save up to 40% with group shipments
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Ship Smarter, <br />
                <span className="text-sky-300">Save More</span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-xl">
                Join verified courier companies, group your shipments, and cut
                delivery costs while enjoying real-time tracking and secure
                payments.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/register" className="btn-primary text-base px-6 py-3">
                  Get Started →
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center justify-center rounded-md border-2 border-slate-500 px-6 py-3 text-base font-semibold text-white hover:bg-slate-800 transition"
                >
                  Track Shipment
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div>
                  <p className="text-2xl font-bold text-white">45+</p>
                  <p className="text-sm text-slate-400">Courier Companies</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">10K+</p>
                  <p className="text-sm text-slate-400">Deliveries</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">15+</p>
                  <p className="text-sm text-slate-400">Cities Covered</p>
                </div>
              </div>
            </div>

            {/* Right: Quick Track Card */}
            <div className="card bg-white text-slate-900 shadow-2xl max-w-md mx-auto lg:mx-0 w-full">
              <div className="border-b border-gray-200 px-5 py-4">
                <p className="text-base font-semibold flex items-center gap-2">
                  📍 Track your shipment
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  No login required. Enter tracking number and phone last 4 digits.
                </p>
              </div>
              <form className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tracking Number
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="TRK123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone (Last 4 digits)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="XXXX"
                    maxLength={4}
                  />
                </div>
                <Link to="/track" className="btn-primary w-full block text-center">
                  🔍 Track Now
                </Link>
                <p className="text-xs text-gray-500 text-center pt-2">
                  💡 For live map tracking, <Link to="/login" className="text-primary-600 font-medium hover:underline">login to your account</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose TPTS */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Why choose <span className="text-primary-600">TPTS</span>?
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Built for customers, courier companies, and delivery agents.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: "📦",
                title: "Group Buy Savings",
                desc: "Join group shipments and save up to 40% on delivery costs.",
                color: "bg-primary-50 text-primary-600",
              },
              {
                icon: "📍",
                title: "Live Tracking",
                desc: "Real-time updates, OTP verification, and proof-of-delivery photos.",
                color: "bg-indigo-50 text-indigo-600",
              },
              {
                icon: "🌱",
                title: "Eco-Friendly Routes",
                desc: "Smarter routing reduces trips and carbon footprint.",
                color: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: "🏢",
                title: "Multiple Companies",
                desc: "Choose from 45+ verified local courier companies with transparent pricing.",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: "💳",
                title: "Secure Payments",
                desc: "Razorpay integration with UPI, cards, and wallet support.",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: "🔒",
                title: "Insured Deliveries",
                desc: "All parcels are insured and protected throughout the journey.",
                color: "bg-orange-50 text-orange-600",
              },
            ].map((feature, idx) => (
              <div key={idx} className="card p-6 hover:shadow-lg transition">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${feature.color}`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-primary-50 to-indigo-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 mb-3">
            How it works
          </h2>
          <p className="text-center text-gray-600 mb-12">Simple, fast, and transparent</p>

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { num: 1, title: "Book", desc: "Create a parcel order, choose company & group option.", icon: "📝" },
              { num: 2, title: "Pay", desc: "Secure payment via Razorpay with instant confirmation.", icon: "💳" },
              { num: 3, title: "Track", desc: "Follow every step with live GPS tracking.", icon: "📍" },
              { num: 4, title: "Receive", desc: "Delivered with OTP verification and photo proof.", icon: "✅" },
            ].map((step) => (
              <li key={step.num} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition text-center">
                <div className="flex justify-center mb-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white text-xl font-bold shadow-lg">
                    {step.num}
                  </span>
                </div>
                <div className="text-3xl mb-3">{step.icon}</div>
                <p className="text-lg font-semibold text-gray-900">{step.title}</p>
                <p className="mt-2 text-sm text-gray-600">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Benefits for Different Users */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 mb-12">
            Who benefits from TPTS?
          </h2>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* For Customers */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8 shadow-md hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-600 text-white p-3 rounded-lg">
                  <FaUsers size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Customers</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Save up to 40%</strong> with group buy shipments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>45+ local companies</strong> to choose from with transparent rates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Real-time GPS tracking</strong> of your parcels</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Secure payments</strong> via Razorpay (UPI, Cards, Wallet)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>OTP verification</strong> and photo proof of delivery</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Insurance coverage</strong> on all shipments</span>
                </li>
              </ul>
              <Link to="/register" className="mt-6 btn-primary w-full block text-center">
                Start Shipping
              </Link>
            </div>

            {/* For Company Admins */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-8 shadow-md hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-600 text-white p-3 rounded-lg">
                  <FaBriefcase size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Companies</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Reach more customers</strong> across India</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Manage agents</strong> and track all deliveries in one dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Automated payments</strong> and wallet management</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Create group shipments</strong> to maximize vehicle capacity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Real-time analytics</strong> on earnings and performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Post job listings</strong> to hire delivery agents</span>
                </li>
              </ul>
              <Link to="/register" className="mt-6 btn-primary bg-purple-600 hover:bg-purple-700 w-full block text-center">
                Register Company
              </Link>
            </div>

            {/* For Delivery Agents */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-8 shadow-md hover:shadow-xl transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-600 text-white p-3 rounded-lg">
                  <FaTruck size={24} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">For Agents</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Earn ₹15K-28K</strong> per month with flexible hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Optimized routes</strong> to complete more deliveries</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Instant wallet payouts</strong> after delivery confirmation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>GPS-enabled app</strong> for easy navigation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Performance bonuses</strong> and ratings system</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700"><strong>Work with verified companies</strong> across multiple cities</span>
                </li>
              </ul>
              <Link to="/jobs" className="mt-6 btn-primary bg-green-600 hover:bg-green-700 w-full block text-center">
                View Job Openings
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats & Trust Section */}
      <section className="bg-gradient-to-r from-primary-600 to-indigo-600 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold mb-12">Trusted by thousands across India</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <FaTruck className="text-5xl mx-auto mb-3 opacity-90" />
              <p className="text-4xl font-bold">10,000+</p>
              <p className="text-primary-100 mt-2">Successful Deliveries</p>
            </div>
            <div>
              <FaUsers className="text-5xl mx-auto mb-3 opacity-90" />
              <p className="text-4xl font-bold">5,000+</p>
              <p className="text-primary-100 mt-2">Happy Customers</p>
            </div>
            <div>
              <FaBriefcase className="text-5xl mx-auto mb-3 opacity-90" />
              <p className="text-4xl font-bold">45+</p>
              <p className="text-primary-100 mt-2">Partner Companies</p>
            </div>
            <div>
              <FaMapMarkerAlt className="text-5xl mx-auto mb-3 opacity-90" />
              <p className="text-4xl font-bold">15+</p>
              <p className="text-primary-100 mt-2">Cities Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-300 mb-2">
              Ready to ship?
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Create your free TPTS account today
            </h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers saving money on every shipment
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-primary bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 text-lg">
                Create Account →
              </Link>
              <Link
                to="/jobs"
                className="btn-outline border-white text-white hover:bg-gray-800 px-8 py-3 text-lg"
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
