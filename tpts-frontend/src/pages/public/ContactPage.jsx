import { useState } from 'react';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaFacebook, FaTwitter, FaLinkedin, FaInstagram } from 'react-icons/fa';
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Get in <span className="text-primary-600">Touch</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Have questions? We'd love to hear from you. Reach out anytime!
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-8 rounded-lg text-center hover:shadow-lg transition-shadow">
              <FaPhone className="text-4xl text-primary-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Call Us</h3>
              <p className="text-gray-600 mb-2">Available 24/7</p>
              <a href="tel:+919876543210" className="text-primary-600 font-bold hover:underline">
                +91 98765 43210
              </a>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-lg text-center hover:shadow-lg transition-shadow">
              <FaEnvelope className="text-4xl text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600 mb-2">Reply within 24 hours</p>
              <a href="mailto:alamalujai@gmail.com" className="text-green-600 font-bold hover:underline text-sm">
                alamalujai@gmail.com
              </a>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-lg text-center hover:shadow-lg transition-shadow">
              <FaMapMarkerAlt className="text-4xl text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Visit Us</h3>
              <p className="text-gray-600 text-sm">
                Tech Park, Chennai<br/>
                Tamil Nadu, India
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-lg text-center hover:shadow-lg transition-shadow">
              <FaClock className="text-4xl text-orange-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Business Hours</h3>
              <p className="text-gray-600 text-sm">
                Mon - Fri: 9 AM - 6 PM<br/>
                Sat - Sun: 10 AM - 4 PM
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-16 bg-gradient-to-r from-primary-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your@email.com"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+91 98765 43210"
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="How can we help?"
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Message <span className="text-red-500">*</span></label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us more..."
                    rows="5"
                    className="input resize-none"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    ⚠️ {error}
                  </div>
                )}

                {submitted && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                    ✓ Message sent successfully! We'll get back to you soon.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Why Contact Us?</h2>
              
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-lg border-l-4 border-primary-600 shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Report an Issue</h3>
                  <p className="text-gray-600">
                    Experiencing problems with your shipment or account? Our support team is here to help resolve it quickly.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border-l-4 border-green-500 shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Partnership Inquiries</h3>
                  <p className="text-gray-600">
                    Are you a logistics company or delivery service? Let's explore partnership opportunities together.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border-l-4 border-purple-500 shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Feedback & Suggestions</h3>
                  <p className="text-gray-600">
                    Your feedback helps us improve. Share your suggestions to make TPTS better for everyone.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-lg border-l-4 border-yellow-500 shadow-md">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Career Opportunities</h3>
                  <p className="text-gray-600">
                    Join our growing team! Check our <a href="/jobs" className="text-primary-600 hover:underline">Jobs page</a> for open positions.
                  </p>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-12">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Connect With Us</h3>
                <div className="flex space-x-4">
                  <a href="#" className="bg-white p-4 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors shadow-md">
                    <FaFacebook size={24} />
                  </a>
                  <a href="#" className="bg-white p-4 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors shadow-md">
                    <FaTwitter size={24} />
                  </a>
                  <a href="#" className="bg-white p-4 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors shadow-md">
                    <FaLinkedin size={24} />
                  </a>
                  <a href="#" className="bg-white p-4 rounded-lg text-pink-600 hover:bg-pink-50 transition-colors shadow-md">
                    <FaInstagram size={24} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <details className="bg-gray-50 p-6 rounded-lg cursor-pointer group hover:bg-gray-100">
              <summary className="flex items-center justify-between font-bold text-gray-900 text-lg">
                <span>What is TPTS?</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-gray-600 mt-4">
                TPTS (Trail Parcel Tracking System) is India's innovative logistics platform that combines group shipments with real-time tracking to offer affordable, transparent, and eco-friendly delivery solutions.
              </p>
            </details>

            <details className="bg-gray-50 p-6 rounded-lg cursor-pointer group hover:bg-gray-100">
              <summary className="flex items-center justify-between font-bold text-gray-900 text-lg">
                <span>How much can I save?</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-gray-600 mt-4">
                You can save up to 40% on delivery costs by grouping your shipments with others heading in the same direction. The savings depend on the number of items grouped and distance traveled.
              </p>
            </details>

            <details className="bg-gray-50 p-6 rounded-lg cursor-pointer group hover:bg-gray-100">
              <summary className="flex items-center justify-between font-bold text-gray-900 text-lg">
                <span>Is my shipment insured?</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-gray-600 mt-4">
                Yes! All shipments on TPTS come with insurance coverage. Your parcels are protected throughout their journey. Full details are available in your shipment receipt.
              </p>
            </details>

            <details className="bg-gray-50 p-6 rounded-lg cursor-pointer group hover:bg-gray-100">
              <summary className="flex items-center justify-between font-bold text-gray-900 text-lg">
                <span>How do I track my parcel?</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-gray-600 mt-4">
                You can track your parcel in real-time using the tracking number on our homepage. Your delivery agent's location is updated in real-time, and you'll receive notifications at each milestone.
              </p>
            </details>

            <details className="bg-gray-50 p-6 rounded-lg cursor-pointer group hover:bg-gray-100">
              <summary className="flex items-center justify-between font-bold text-gray-900 text-lg">
                <span>Can I become a delivery agent?</span>
                <span className="text-primary-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-gray-600 mt-4">
                Yes! We're always looking for professional delivery agents. Visit our <a href="/jobs" className="text-primary-600 hover:underline">Jobs page</a> to apply. Earn competitive income with flexible working hours.
              </p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
