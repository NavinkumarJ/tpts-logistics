import { Link } from 'react-router-dom';
import { FaTruck, FaGlobe, FaLeaf, FaUsers, FaAward, FaHeartbeat } from 'react-icons/fa';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              About <span className="text-primary-600">TPTS</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Revolutionizing logistics through group buying, sustainable delivery, and transparent pricing
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-4">
                To make logistics affordable, sustainable, and transparent for everyone. We believe that group buying power can transform the delivery industry by reducing costs, improving efficiency, and creating positive environmental impact.
              </p>
              <p className="text-lg text-gray-600">
                TPTS (Trail Parcel Tracking System) is India's first platform that combines group shipments with real-time tracking, giving customers unprecedented control and savings over their logistics costs.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <FaTruck className="text-4xl text-primary-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Logistics</h3>
                <p className="text-sm text-gray-600">Intelligent routing and grouping</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <FaLeaf className="text-4xl text-green-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Eco-Friendly</h3>
                <p className="text-sm text-gray-600">Carbon neutral deliveries</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <FaGlobe className="text-4xl text-purple-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Pan-India</h3>
                <p className="text-sm text-gray-600">Coverage across major cities</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <FaAward className="text-4xl text-yellow-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Transparent</h3>
                <p className="text-sm text-gray-600">Clear pricing, no hidden charges</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gradient-to-r from-primary-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Why Choose TPTS?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Save Up to 40%</h3>
              <p className="text-gray-600">
                Group your shipments with others and unlock massive savings on delivery costs. The more you ship, the more you save.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Track your parcels in real-time with GPS enabled delivery agents. Know exactly where your shipment is at all times.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Eco Impact</h3>
              <p className="text-gray-600">
                Every group shipment reduces carbon emissions. Join our sustainability mission and earn eco-points while shipping.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trusted Network</h3>
              <p className="text-gray-600">
                Partner with verified companies and professional delivery agents across India.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Fast Delivery</h3>
              <p className="text-gray-600">
                Optimized routes and professional agents ensure your parcels reach on time, every time.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure & Safe</h3>
              <p className="text-gray-600">
                Insurance coverage for all shipments. Your parcels are protected throughout their journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Our Story</h2>
          <div className="bg-gradient-to-r from-primary-50 to-indigo-50 p-12 rounded-lg shadow-md">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              TPTS was founded with a simple vision: to democratize logistics in India. We saw how businesses and individuals were overpaying for delivery services due to fragmented supply chains and inefficient routes.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Our solution? Group buying power applied to logistics. By combining multiple shipments heading in the same direction, we achieve economies of scale that benefit everyone involved - customers save money, delivery agents earn more, and the environment benefits from reduced emissions.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Today, we're proud to serve thousands of customers across major Indian cities, partner with trusted courier companies, and employ professional delivery agents. But this is just the beginning. We're on a mission to transform how India ships.
            </p>
          </div>
        </div>
      </section>

      {/* Team Values */}
      <section className="py-16 bg-gradient-to-r from-primary-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Our Values</h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transparency</h3>
              <p className="text-gray-600">Clear communication and honest pricing in everything we do</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">💡</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Innovation</h3>
              <p className="text-gray-600">Constantly improving our platform with latest technology</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">🌍</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sustainability</h3>
              <p className="text-gray-600">Committed to reducing our environmental footprint</p>
            </div>
            <div className="text-center">
              <div className="text-5xl mb-4">👨‍💼</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Responsibility</h3>
              <p className="text-gray-600">Accountable to our users, partners, and community</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
