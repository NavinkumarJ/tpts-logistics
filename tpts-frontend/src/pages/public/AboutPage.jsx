import { Link } from 'react-router-dom';
import { FaTruck, FaUsers, FaAward, FaArrowLeft, FaMapMarkerAlt, FaShieldAlt, FaHandshake, FaLightbulb, FaUserTie, FaStar, FaCamera, FaBuilding, FaUserCheck, FaMobileAlt, FaCreditCard, FaComments, FaBriefcase } from 'react-icons/fa';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
        >
          <FaArrowLeft className="text-sm group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Hero Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              About <span className="text-primary-400">TPTS</span>
            </h1>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Revolutionizing logistics through group buying, transparent pricing, and verified delivery
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-lg text-white/70 mb-4">
                To make logistics affordable and transparent for everyone. We believe that group buying power can transform the delivery industry by reducing costs and improving efficiency.
              </p>
              <p className="text-lg text-white/70">
                TPTS (Trail Parcel Tracking System) is India's innovative platform that combines group shipments with real-time OTP-verified tracking, giving customers unprecedented control and savings over their logistics costs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                  <FaTruck className="text-2xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Smart Logistics</h3>
                <p className="text-sm text-white/60">Group shipping & route optimization</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-4 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
                  <FaShieldAlt className="text-2xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Verified Delivery</h3>
                <p className="text-sm text-white/60">OTP & photo proof verification</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
                  <FaStar className="text-2xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Rated Service</h3>
                <p className="text-sm text-white/60">Review companies & agents</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all group">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/30 group-hover:shadow-yellow-500/50 transition-shadow">
                  <FaAward className="text-2xl text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Transparent</h3>
                <p className="text-sm text-white/60">Clear pricing with GST breakdown</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us - Updated with actual features */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Why Choose TPTS?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "💰", title: "Save Up to 40%", desc: "Group your shipments with others heading to the same destination and unlock massive savings on delivery costs.", gradient: "from-green-500 to-emerald-600" },
              { icon: "📍", title: "OTP Verified Tracking", desc: "Secure pickup and delivery with OTP verification. Track your parcels in real-time with photo proof at every step.", gradient: "from-blue-500 to-cyan-600" },
              { icon: "⭐", title: "Rate & Review", desc: "Rate delivery agents and companies. Make informed decisions based on authentic customer reviews and ratings.", gradient: "from-yellow-500 to-orange-600" },
              { icon: "👥", title: "Trusted Network", desc: "Partner with verified companies and professional delivery agents who apply through our job portal.", gradient: "from-purple-500 to-violet-600" },
              { icon: "💳", title: "Secure Payments", desc: "Pay online via Razorpay or cash on delivery. Balance payments collected with photo proof for group orders.", gradient: "from-indigo-500 to-purple-600" },
              { icon: "💬", title: "In-App Messaging", desc: "Communicate directly with companies and agents through our built-in messaging system.", gradient: "from-teal-500 to-cyan-600" },
            ].map((item, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 hover:bg-white/15 hover:scale-[1.02] transition-all duration-300 group">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6 text-3xl shadow-lg group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-white/60">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Platform Features</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: FaUsers, title: "For Customers", desc: "Create orders, join group shipments, track parcels, and rate your experience", color: "from-blue-500 to-blue-600" },
              { icon: FaBuilding, title: "For Companies", desc: "Manage orders, create group shipments, hire agents, and grow your business", color: "from-green-500 to-green-600" },
              { icon: FaUserCheck, title: "For Agents", desc: "Accept deliveries, verify with OTP, upload photo proof, and complete pickups & deliveries", color: "from-orange-500 to-orange-600" },
              { icon: FaUserTie, title: "For Admins", desc: "Monitor platform, approve companies, manage users, and view analytics", color: "from-purple-500 to-purple-600" },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all text-center group">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="text-2xl text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Our Story</h2>
          <div className="bg-white/10 backdrop-blur-xl p-10 md:p-12 rounded-3xl border border-white/20 hover:bg-white/15 transition-all">
            <p className="text-lg text-white leading-relaxed mb-6">
              TPTS was founded with a simple vision: to democratize logistics in India. We saw how businesses and individuals were overpaying for delivery services due to fragmented supply chains and inefficient routes.
            </p>
            <p className="text-lg text-white leading-relaxed mb-6">
              Our solution? <span className="font-bold text-primary-400">Group buying power applied to logistics.</span> By combining multiple shipments heading in the same direction, we achieve economies of scale that benefit everyone involved - customers save money and delivery agents earn more.
            </p>
            <p className="text-lg text-white leading-relaxed">
              With features like OTP-verified pickups and deliveries, photo proof, integrated payments, and a comprehensive rating system, <span className="font-bold text-primary-400">we're building a transparent and efficient logistics ecosystem.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Key Capabilities</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: FaTruck, title: "Group Buy Shipping", desc: "Join existing groups or create new ones to save up to 40% on shipping" },
              { icon: FaMobileAlt, title: "OTP Verification", desc: "Secure pickup and delivery with one-time password verification" },
              { icon: FaCamera, title: "Photo Proof", desc: "Capture proof photos at pickup and delivery for complete transparency" },
              { icon: FaCreditCard, title: "Razorpay Integration", desc: "Secure online payments with multiple payment options" },
              { icon: FaHandshake, title: "Cash Collection", desc: "Agents can collect balance payments in cash with photo proof" },
              { icon: FaComments, title: "In-App Chat", desc: "Direct messaging between customers, companies, and agents" },
              { icon: FaStar, title: "Rating System", desc: "Rate and review companies and agents after delivery" },
              { icon: FaBriefcase, title: "Job Portal", desc: "Companies can post jobs and hire delivery agents" },
              { icon: FaMapMarkerAlt, title: "Real-Time Tracking", desc: "Track your parcels with live status updates" },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 hover:bg-white/15 transition-all flex items-start gap-4 group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                    <IconComponent className="text-xl text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-white/60">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-16 pb-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Our Values</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: FaHandshake, title: "Transparency", desc: "Clear communication and honest pricing with full GST breakdown", color: "from-blue-500 to-blue-600" },
              { icon: FaLightbulb, title: "Innovation", desc: "Constantly improving with OTP verification and group shipping", color: "from-yellow-500 to-yellow-600" },
              { icon: FaShieldAlt, title: "Security", desc: "Photo proof, OTP verification, and secure payment processing", color: "from-green-500 to-green-600" },
              { icon: FaUserTie, title: "Accountability", desc: "Rating system ensures quality service from all partners", color: "from-purple-500 to-purple-600" },
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div key={idx} className="text-center group">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent className="text-3xl text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-white/60">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
