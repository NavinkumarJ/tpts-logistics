import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaArrowLeft, FaExclamationTriangle, FaCheckCircle, FaSpinner, FaUser, FaPaperPlane, FaHandshake, FaCommentDots, FaBriefcase, FaChevronDown } from 'react-icons/fa';
import apiClient from '../../utils/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send to backend contact API
      await apiClient.post('/public/contact', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError('Failed to send message. Please try again or email us directly.');
      console.error('Contact form error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
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
      <section className="py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Get in <span className="text-primary-400">Touch</span>
            </h1>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Reach out anytime!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-center hover:bg-white/15 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                <FaPhone className="text-xl text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Call Us</h3>
              <p className="text-white/50 text-sm mb-2">Available 24/7</p>
              <a href="tel:+919876543210" className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">
                +91 98765 43210
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-center hover:bg-white/15 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-shadow">
                <FaEnvelope className="text-xl text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Email</h3>
              <p className="text-white/50 text-sm mb-2">Reply within 24 hours</p>
              <a href="mailto:alamalujai@gmail.com" className="text-green-400 font-semibold hover:text-green-300 transition-colors text-sm">
                alamalujai@gmail.com
              </a>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-center hover:bg-white/15 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/50 transition-shadow">
                <FaMapMarkerAlt className="text-xl text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Visit Us</h3>
              <p className="text-white/60 text-sm">
                Tech Park, Chennai<br />
                Tamil Nadu, India
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-6 rounded-2xl border border-white/20 text-center hover:bg-white/15 transition-all group">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                <FaClock className="text-xl text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Business Hours</h3>
              <p className="text-white/60 text-sm">
                Mon - Fri: 9 AM - 6 PM<br />
                Sat - Sun: 10 AM - 4 PM
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Form */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-white/80 font-medium mb-2 text-sm">Name <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaUser className="text-white/40" />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Your name"
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2 text-sm">Email <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaEnvelope className="text-white/40" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="your@email.com"
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2 text-sm">Phone</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <FaPhone className="text-white/40" />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-11 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2 text-sm">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="How can we help?"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/80 font-medium mb-2 text-sm">Message <span className="text-red-400">*</span></label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us more..."
                    rows="4"
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 px-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-500/20 backdrop-blur-sm border border-red-400/30 p-4 flex items-start gap-3">
                    <FaExclamationTriangle className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-100">{error}</p>
                  </div>
                )}

                {submitted && (
                  <div className="rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-400/30 p-4 flex items-center gap-3">
                    <FaCheckCircle className="text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-100">Message sent successfully! We'll get back to you soon.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-500/30 hover:shadow-primary-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Why Contact Us?</h2>

              <div className="space-y-4">
                {[
                  { icon: FaExclamationTriangle, title: "Report an Issue", desc: "Experiencing problems with your shipment or account? Our support team is here to help resolve it quickly.", color: "from-blue-500 to-blue-600", border: "border-l-blue-400" },
                  { icon: FaHandshake, title: "Partnership Inquiries", desc: "Are you a logistics company or delivery service? Let's explore partnership opportunities together.", color: "from-green-500 to-green-600", border: "border-l-green-400" },
                  { icon: FaCommentDots, title: "Feedback & Suggestions", desc: "Your feedback helps us improve. Share your suggestions to make TPTS better for everyone.", color: "from-purple-500 to-purple-600", border: "border-l-purple-400" },
                  { icon: FaBriefcase, title: "Career Opportunities", desc: "Join our growing team! Check our Jobs page for open positions.", color: "from-yellow-500 to-yellow-600", border: "border-l-yellow-400" },
                ].map((item, idx) => {
                  const IconComponent = item.icon;
                  return (
                    <div key={idx} className={`bg-white/10 backdrop-blur-xl p-5 rounded-xl border border-white/20 border-l-4 ${item.border} hover:bg-white/15 transition-all`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{item.title}</h3>
                          <p className="text-white/60 text-sm">{item.desc}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>


            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 pb-24 relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              { q: "What is TPTS?", a: "TPTS (Trail Parcel Tracking System) is India's innovative logistics platform that combines group shipments with OTP-verified tracking to offer affordable and transparent delivery solutions." },
              { q: "How much can I save with group shipping?", a: "You can save up to 40% on delivery costs by grouping your shipments with others heading in the same direction. The savings depend on the number of members in the group and the route." },
              { q: "How does OTP verification work?", a: "Both pickup and delivery are secured with one-time passwords (OTP). The agent verifies the OTP at pickup and the receiver verifies at delivery. Photo proof is also captured for complete transparency." },
              { q: "How do I track my parcel?", a: "You can track your parcel in real-time using the tracking number on our homepage. You'll receive notifications at each milestone - from pickup to delivery." },
              { q: "Can I rate the delivery experience?", a: "Yes! After delivery, you can rate both the company and delivery agent. Your ratings help maintain service quality across the platform." },
              { q: "How can I become a delivery agent?", a: "Visit our Jobs page to see available positions from courier companies. You can apply directly through the platform and companies will review your application." },
              { q: "What payment methods are accepted?", a: "We accept online payments via Razorpay (UPI, cards, net banking). For group orders with balance due, agents can also collect cash payments with photo proof." },
            ].map((item, idx) => (
              <details key={idx} className="bg-white/10 backdrop-blur-xl rounded-xl border border-white/20 overflow-hidden group">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition-colors">
                  <span className="font-bold text-white text-lg">{item.q}</span>
                  <FaChevronDown className="text-primary-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-white/70">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
